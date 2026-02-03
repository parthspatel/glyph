//! Workflow event types for event sourcing
//!
//! All workflow state changes are captured as immutable events.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::state::StepResult;

// =============================================================================
// Workflow Events
// =============================================================================

/// All possible workflow events
///
/// Each variant captures a specific state change in the workflow lifecycle.
/// Events are immutable once stored and form the authoritative history.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WorkflowEvent {
    /// Workflow execution started
    WorkflowStarted {
        workflow_id: Uuid,
        config_version: String,
        started_at: DateTime<Utc>,
    },

    /// Step became active and ready for work
    StepActivated {
        step_id: String,
        assigned_to: Vec<Uuid>,
        activated_at: DateTime<Utc>,
    },

    /// Step completed successfully
    StepCompleted {
        step_id: String,
        result: StepResult,
        completed_at: DateTime<Utc>,
    },

    /// Step failed (may be retried)
    StepFailed {
        step_id: String,
        error: String,
        retries: u8,
        failed_at: DateTime<Utc>,
    },

    /// Step was skipped (condition not met)
    StepSkipped {
        step_id: String,
        reason: String,
        skipped_at: DateTime<Utc>,
    },

    /// Transition from one step to another
    TransitionOccurred {
        from_step: String,
        to_step: String,
        condition_met: Option<String>,
        occurred_at: DateTime<Utc>,
    },

    /// Consensus was calculated for a step
    ConsensusCalculated {
        step_id: String,
        agreement: f64,
        metric: String,
        resolved_by: Option<String>,
        calculated_at: DateTime<Utc>,
    },

    /// Workflow context was updated
    ContextUpdated {
        key: String,
        value: serde_json::Value,
        updated_at: DateTime<Utc>,
    },

    /// Workflow completed successfully
    WorkflowCompleted {
        final_output: serde_json::Value,
        completed_at: DateTime<Utc>,
    },

    /// Workflow failed terminally
    WorkflowFailed {
        error: String,
        recoverable: bool,
        failed_at: DateTime<Utc>,
    },
}

impl WorkflowEvent {
    /// Get the event type name for storage
    #[must_use]
    pub fn event_type(&self) -> &'static str {
        match self {
            Self::WorkflowStarted { .. } => "workflow_started",
            Self::StepActivated { .. } => "step_activated",
            Self::StepCompleted { .. } => "step_completed",
            Self::StepFailed { .. } => "step_failed",
            Self::StepSkipped { .. } => "step_skipped",
            Self::TransitionOccurred { .. } => "transition_occurred",
            Self::ConsensusCalculated { .. } => "consensus_calculated",
            Self::ContextUpdated { .. } => "context_updated",
            Self::WorkflowCompleted { .. } => "workflow_completed",
            Self::WorkflowFailed { .. } => "workflow_failed",
        }
    }

    /// Get the timestamp when the event occurred
    #[must_use]
    pub fn occurred_at(&self) -> DateTime<Utc> {
        match self {
            Self::WorkflowStarted { started_at, .. } => *started_at,
            Self::StepActivated { activated_at, .. } => *activated_at,
            Self::StepCompleted { completed_at, .. } => *completed_at,
            Self::StepFailed { failed_at, .. } => *failed_at,
            Self::StepSkipped { skipped_at, .. } => *skipped_at,
            Self::TransitionOccurred { occurred_at, .. } => *occurred_at,
            Self::ConsensusCalculated { calculated_at, .. } => *calculated_at,
            Self::ContextUpdated { updated_at, .. } => *updated_at,
            Self::WorkflowCompleted { completed_at, .. } => *completed_at,
            Self::WorkflowFailed { failed_at, .. } => *failed_at,
        }
    }
}

// =============================================================================
// Stored Event
// =============================================================================

/// An event as stored in the event store
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredEvent {
    /// Unique event identifier
    pub event_id: Uuid,

    /// Stream (aggregate) identifier
    pub stream_id: Uuid,

    /// Type of stream (e.g., "workflow", "project")
    pub stream_type: String,

    /// Version within the stream (monotonically increasing)
    pub version: u64,

    /// The actual event data
    pub event: WorkflowEvent,

    /// Additional metadata (user_id, correlation_id, etc.)
    pub metadata: serde_json::Value,

    /// When the event was stored
    pub occurred_at: DateTime<Utc>,
}

impl StoredEvent {
    /// Create a new stored event
    #[must_use]
    pub fn new(
        stream_id: Uuid,
        stream_type: impl Into<String>,
        version: u64,
        event: WorkflowEvent,
        metadata: serde_json::Value,
    ) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            stream_id,
            stream_type: stream_type.into(),
            version,
            event: event.clone(),
            metadata,
            occurred_at: event.occurred_at(),
        }
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_serialization() {
        let event = WorkflowEvent::WorkflowStarted {
            workflow_id: Uuid::new_v4(),
            config_version: "1.0.0".to_string(),
            started_at: Utc::now(),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("workflow_started"));

        let parsed: WorkflowEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(event.event_type(), parsed.event_type());
    }

    #[test]
    fn test_event_type_names() {
        let events = vec![
            WorkflowEvent::WorkflowStarted {
                workflow_id: Uuid::new_v4(),
                config_version: "1.0".to_string(),
                started_at: Utc::now(),
            },
            WorkflowEvent::StepActivated {
                step_id: "step1".to_string(),
                assigned_to: vec![],
                activated_at: Utc::now(),
            },
            WorkflowEvent::WorkflowCompleted {
                final_output: serde_json::json!({}),
                completed_at: Utc::now(),
            },
        ];

        assert_eq!(events[0].event_type(), "workflow_started");
        assert_eq!(events[1].event_type(), "step_activated");
        assert_eq!(events[2].event_type(), "workflow_completed");
    }

    #[test]
    fn test_stored_event_creation() {
        let event = WorkflowEvent::StepCompleted {
            step_id: "review".to_string(),
            result: StepResult::approved(),
            completed_at: Utc::now(),
        };

        let stored = StoredEvent::new(
            Uuid::new_v4(),
            "workflow",
            1,
            event,
            serde_json::json!({"user_id": "test"}),
        );

        assert_eq!(stored.version, 1);
        assert_eq!(stored.stream_type, "workflow");
    }
}
