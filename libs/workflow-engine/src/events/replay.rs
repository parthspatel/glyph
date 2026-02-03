//! State replay from event stream
//!
//! Reconstructs workflow state by loading the latest snapshot
//! and replaying events since that snapshot.

use std::sync::Arc;

use chrono::Utc;
use thiserror::Error;
use uuid::Uuid;

use super::event_types::WorkflowEvent;
use super::store::{EventStore, EventStoreError};
use crate::state::{StepResult, WorkflowStateManager};

// =============================================================================
// Errors
// =============================================================================

/// Replay errors
#[derive(Debug, Error)]
pub enum ReplayError {
    /// Event store error
    #[error("Event store error: {0}")]
    EventStoreError(#[from] EventStoreError),

    /// Invalid event sequence
    #[error("Invalid event sequence: {0}")]
    InvalidEventSequence(String),

    /// Snapshot corrupted
    #[error("Snapshot data corrupted")]
    SnapshotCorrupted,

    /// State transition failed during replay
    #[error("State transition failed: {0}")]
    StateTransitionFailed(String),
}

// =============================================================================
// State Rebuilder
// =============================================================================

/// Rebuilds workflow state from events
pub struct StateRebuilder {
    event_store: Arc<dyn EventStore>,
}

impl StateRebuilder {
    /// Create a new state rebuilder
    #[must_use]
    pub fn new(event_store: Arc<dyn EventStore>) -> Self {
        Self { event_store }
    }

    /// Rebuild state for a workflow stream
    ///
    /// Loads the latest snapshot (if any) and replays events since.
    pub async fn rebuild_state(
        &self,
        stream_id: Uuid,
        step_ids: &[&str],
    ) -> Result<WorkflowStateManager, ReplayError> {
        // Try to load latest snapshot
        let snapshot = self.event_store.get_latest_snapshot(stream_id).await?;

        let (mut state, from_version) = if let Some(snap) = snapshot {
            let version = snap.version;
            (WorkflowStateManager::from_snapshot(snap), version)
        } else {
            // No snapshot - need to replay from beginning
            // We need a WorkflowStarted event to know the entry step
            let entry_step = step_ids.first().copied().unwrap_or("unknown");
            (WorkflowStateManager::new(entry_step, step_ids), 0)
        };

        // Load events after snapshot
        let events = self
            .event_store
            .load_events(stream_id, from_version)
            .await?;

        // Replay each event
        for stored_event in events {
            self.apply_event(&mut state, &stored_event.event)?;
        }

        Ok(state)
    }

    /// Apply a single event to the state
    fn apply_event(
        &self,
        state: &mut WorkflowStateManager,
        event: &WorkflowEvent,
    ) -> Result<(), ReplayError> {
        match event {
            WorkflowEvent::WorkflowStarted { .. } => {
                // State already initialized - nothing to do
                Ok(())
            }

            WorkflowEvent::StepActivated {
                step_id,
                assigned_to,
                ..
            } => {
                state
                    .activate_step(step_id, assigned_to.clone())
                    .map_err(|e| ReplayError::StateTransitionFailed(e.to_string()))?;
                Ok(())
            }

            WorkflowEvent::StepCompleted {
                step_id, result, ..
            } => {
                state
                    .complete_step(step_id, result.clone())
                    .map_err(|e| ReplayError::StateTransitionFailed(e.to_string()))?;
                Ok(())
            }

            WorkflowEvent::StepFailed { step_id, error, .. } => {
                state
                    .fail_step(step_id, error)
                    .map_err(|e| ReplayError::StateTransitionFailed(e.to_string()))?;
                Ok(())
            }

            WorkflowEvent::StepSkipped {
                step_id, reason, ..
            } => {
                state
                    .skip_step(step_id, reason)
                    .map_err(|e| ReplayError::StateTransitionFailed(e.to_string()))?;
                Ok(())
            }

            WorkflowEvent::TransitionOccurred {
                to_step,
                condition_met,
                ..
            } => {
                let reason = condition_met.as_ref().map_or("transition", |c| c.as_str());
                state
                    .transition_to(to_step, reason)
                    .map_err(|e| ReplayError::StateTransitionFailed(e.to_string()))?;
                Ok(())
            }

            WorkflowEvent::ConsensusCalculated { .. } => {
                // Consensus is informational - doesn't change state directly
                Ok(())
            }

            WorkflowEvent::ContextUpdated { key, value, .. } => {
                state.set_context(key, value.clone());
                Ok(())
            }

            WorkflowEvent::WorkflowCompleted { .. } => {
                state.complete_workflow("workflow_completed");
                Ok(())
            }

            WorkflowEvent::WorkflowFailed { error, .. } => {
                state.complete_workflow(&format!("workflow_failed: {error}"));
                Ok(())
            }
        }
    }

    /// Create a snapshot of current state if needed
    pub async fn maybe_snapshot(
        &self,
        stream_id: Uuid,
        stream_type: &str,
        state: &WorkflowStateManager,
    ) -> Result<bool, ReplayError> {
        let version = state.version();

        // Check if we should snapshot (every 50 events)
        if version > 0 && version % 50 == 0 {
            let snapshot = state.to_snapshot();
            self.event_store
                .save_snapshot(stream_id, stream_type, &snapshot)
                .await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }
}

// =============================================================================
// Event Emitter Helper
// =============================================================================

/// Helper for emitting workflow events
pub struct EventEmitter {
    event_store: Arc<dyn EventStore>,
    stream_id: Uuid,
    stream_type: String,
}

impl EventEmitter {
    /// Create a new event emitter
    #[must_use]
    pub fn new(
        event_store: Arc<dyn EventStore>,
        stream_id: Uuid,
        stream_type: impl Into<String>,
    ) -> Self {
        Self {
            event_store,
            stream_id,
            stream_type: stream_type.into(),
        }
    }

    /// Emit a single event
    pub async fn emit(&self, event: WorkflowEvent) -> Result<u64, EventStoreError> {
        self.emit_with_metadata(event, serde_json::json!({})).await
    }

    /// Emit a single event with metadata
    pub async fn emit_with_metadata(
        &self,
        event: WorkflowEvent,
        metadata: serde_json::Value,
    ) -> Result<u64, EventStoreError> {
        self.event_store
            .append(
                self.stream_id,
                &self.stream_type,
                None,
                vec![event],
                metadata,
            )
            .await
    }

    /// Emit multiple events atomically
    pub async fn emit_batch(&self, events: Vec<WorkflowEvent>) -> Result<u64, EventStoreError> {
        self.event_store
            .append(
                self.stream_id,
                &self.stream_type,
                None,
                events,
                serde_json::json!({}),
            )
            .await
    }

    // =========================================================================
    // Convenience methods for common events
    // =========================================================================

    /// Emit workflow started event
    pub async fn workflow_started(
        &self,
        workflow_id: Uuid,
        config_version: impl Into<String>,
    ) -> Result<u64, EventStoreError> {
        self.emit(WorkflowEvent::WorkflowStarted {
            workflow_id,
            config_version: config_version.into(),
            started_at: Utc::now(),
        })
        .await
    }

    /// Emit step activated event
    pub async fn step_activated(
        &self,
        step_id: impl Into<String>,
        assigned_to: Vec<Uuid>,
    ) -> Result<u64, EventStoreError> {
        self.emit(WorkflowEvent::StepActivated {
            step_id: step_id.into(),
            assigned_to,
            activated_at: Utc::now(),
        })
        .await
    }

    /// Emit step completed event
    pub async fn step_completed(
        &self,
        step_id: impl Into<String>,
        result: StepResult,
    ) -> Result<u64, EventStoreError> {
        self.emit(WorkflowEvent::StepCompleted {
            step_id: step_id.into(),
            result,
            completed_at: Utc::now(),
        })
        .await
    }

    /// Emit step failed event
    pub async fn step_failed(
        &self,
        step_id: impl Into<String>,
        error: impl Into<String>,
        retries: u8,
    ) -> Result<u64, EventStoreError> {
        self.emit(WorkflowEvent::StepFailed {
            step_id: step_id.into(),
            error: error.into(),
            retries,
            failed_at: Utc::now(),
        })
        .await
    }

    /// Emit transition occurred event
    pub async fn transition_occurred(
        &self,
        from_step: impl Into<String>,
        to_step: impl Into<String>,
        condition_met: Option<String>,
    ) -> Result<u64, EventStoreError> {
        self.emit(WorkflowEvent::TransitionOccurred {
            from_step: from_step.into(),
            to_step: to_step.into(),
            condition_met,
            occurred_at: Utc::now(),
        })
        .await
    }

    /// Emit workflow completed event
    pub async fn workflow_completed(
        &self,
        final_output: serde_json::Value,
    ) -> Result<u64, EventStoreError> {
        self.emit(WorkflowEvent::WorkflowCompleted {
            final_output,
            completed_at: Utc::now(),
        })
        .await
    }

    /// Emit workflow failed event
    pub async fn workflow_failed(
        &self,
        error: impl Into<String>,
        recoverable: bool,
    ) -> Result<u64, EventStoreError> {
        self.emit(WorkflowEvent::WorkflowFailed {
            error: error.into(),
            recoverable,
            failed_at: Utc::now(),
        })
        .await
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_replay_error_display() {
        let err = ReplayError::InvalidEventSequence("missing start event".to_string());
        assert!(err.to_string().contains("missing start event"));
    }
}
