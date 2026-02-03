//! Workflow state manager
//!
//! Manages the aggregate state of a workflow execution including
//! all step states, transitions, and shared context.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::step_state::{StateTransitionError, StepResult, StepState};

// =============================================================================
// State Transition Record
// =============================================================================

/// Record of a state transition for audit trail
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTransition {
    /// Previous step (None if workflow just started)
    pub from_step: Option<String>,

    /// New current step
    pub to_step: String,

    /// When the transition occurred
    pub occurred_at: DateTime<Utc>,

    /// Reason for the transition
    pub reason: String,
}

// =============================================================================
// Workflow Snapshot
// =============================================================================

/// Snapshot of workflow state for event sourcing optimization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowSnapshot {
    /// Snapshot version (event count at snapshot time)
    pub version: u64,

    /// Current step ID
    pub current_step_id: Option<String>,

    /// All step states
    pub step_states: HashMap<String, StepState>,

    /// Shared workflow context
    pub context: serde_json::Value,

    /// When snapshot was created
    pub created_at: DateTime<Utc>,
}

// =============================================================================
// Workflow State Manager
// =============================================================================

/// Manages workflow execution state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStateManager {
    /// Current step ID (None if workflow is complete)
    current_step_id: Option<String>,

    /// State of each step
    step_states: HashMap<String, StepState>,

    /// Transition history
    history: Vec<StateTransition>,

    /// Shared context between steps
    context: serde_json::Value,

    /// Event version counter
    version: u64,
}

impl WorkflowStateManager {
    /// Create a new workflow state manager
    ///
    /// # Arguments
    /// * `entry_step_id` - The first step to activate
    /// * `step_ids` - All step IDs in the workflow (initialized to Pending)
    #[must_use]
    pub fn new(entry_step_id: &str, step_ids: &[&str]) -> Self {
        let mut step_states = HashMap::new();

        // Initialize all steps as Pending
        for &step_id in step_ids {
            step_states.insert(step_id.to_string(), StepState::Pending);
        }

        Self {
            current_step_id: Some(entry_step_id.to_string()),
            step_states,
            history: Vec::new(),
            context: serde_json::Value::Object(serde_json::Map::new()),
            version: 0,
        }
    }

    /// Restore state from a snapshot
    #[must_use]
    pub fn from_snapshot(snapshot: WorkflowSnapshot) -> Self {
        Self {
            current_step_id: snapshot.current_step_id,
            step_states: snapshot.step_states,
            history: Vec::new(), // History not stored in snapshots
            context: snapshot.context,
            version: snapshot.version,
        }
    }

    /// Get the current step ID
    #[must_use]
    pub fn current_step(&self) -> Option<&str> {
        self.current_step_id.as_deref()
    }

    /// Get the state of a specific step
    #[must_use]
    pub fn get_step_state(&self, step_id: &str) -> Option<&StepState> {
        self.step_states.get(step_id)
    }

    /// Get all step states
    #[must_use]
    pub fn all_step_states(&self) -> &HashMap<String, StepState> {
        &self.step_states
    }

    /// Get the current version (event count)
    #[must_use]
    pub fn version(&self) -> u64 {
        self.version
    }

    /// Set the state of a step with transition validation
    pub fn set_step_state(
        &mut self,
        step_id: &str,
        new_state: StepState,
    ) -> Result<(), StateTransitionError> {
        let current_state = self
            .step_states
            .get(step_id)
            .ok_or_else(|| StateTransitionError::StepNotFound(step_id.to_string()))?;

        if !current_state.can_transition_to(&new_state) {
            return Err(StateTransitionError::InvalidTransition {
                from: current_state.status_name().to_string(),
                to: new_state.status_name().to_string(),
            });
        }

        self.step_states.insert(step_id.to_string(), new_state);
        self.version += 1;

        Ok(())
    }

    /// Activate a step (transition from Pending to Active)
    pub fn activate_step(
        &mut self,
        step_id: &str,
        assigned_to: Vec<Uuid>,
    ) -> Result<(), StateTransitionError> {
        let now = Utc::now();
        let new_state = StepState::Active {
            started_at: now,
            assigned_to,
            last_activity: now,
        };

        self.set_step_state(step_id, new_state)?;
        self.current_step_id = Some(step_id.to_string());

        Ok(())
    }

    /// Complete a step with a result
    pub fn complete_step(
        &mut self,
        step_id: &str,
        result: StepResult,
    ) -> Result<(), StateTransitionError> {
        let new_state = StepState::Completed {
            completed_at: Utc::now(),
            result,
        };

        self.set_step_state(step_id, new_state)
    }

    /// Skip a step with a reason
    pub fn skip_step(&mut self, step_id: &str, reason: &str) -> Result<(), StateTransitionError> {
        let new_state = StepState::Skipped {
            reason: reason.to_string(),
            skipped_at: Utc::now(),
        };

        self.set_step_state(step_id, new_state)
    }

    /// Mark a step as failed
    pub fn fail_step(&mut self, step_id: &str, error: &str) -> Result<(), StateTransitionError> {
        let retries = self
            .step_states
            .get(step_id)
            .and_then(|s| s.retry_count())
            .unwrap_or(0);

        let new_state = StepState::Failed {
            error: error.to_string(),
            retries,
            failed_at: Utc::now(),
        };

        self.set_step_state(step_id, new_state)
    }

    /// Retry a failed step (increment retry counter)
    ///
    /// Returns the new retry count.
    pub fn retry_step(
        &mut self,
        step_id: &str,
        max_retries: u8,
    ) -> Result<u8, StateTransitionError> {
        let current = self
            .step_states
            .get(step_id)
            .ok_or_else(|| StateTransitionError::StepNotFound(step_id.to_string()))?;

        let new_retries = current.retry_count().unwrap_or(0) + 1;

        if new_retries > max_retries {
            return Err(StateTransitionError::MaxRetriesExceeded { max: max_retries });
        }

        // Re-activate the step
        let now = Utc::now();
        let new_state = StepState::Active {
            started_at: now,
            assigned_to: vec![], // Will be re-assigned
            last_activity: now,
        };

        self.set_step_state(step_id, new_state)?;

        Ok(new_retries)
    }

    /// Record activity on the current step (for timeout tracking)
    pub fn record_activity(&mut self, step_id: &str) -> Result<(), StateTransitionError> {
        let current = self
            .step_states
            .get(step_id)
            .ok_or_else(|| StateTransitionError::StepNotFound(step_id.to_string()))?;

        if let StepState::Active {
            started_at,
            assigned_to,
            ..
        } = current
        {
            let new_state = StepState::Active {
                started_at: *started_at,
                assigned_to: assigned_to.clone(),
                last_activity: Utc::now(),
            };
            self.step_states.insert(step_id.to_string(), new_state);
            Ok(())
        } else {
            Err(StateTransitionError::InvalidTransition {
                from: current.status_name().to_string(),
                to: "active".to_string(),
            })
        }
    }

    /// Transition to a new step
    pub fn transition_to(
        &mut self,
        next_step_id: &str,
        reason: &str,
    ) -> Result<(), StateTransitionError> {
        let transition = StateTransition {
            from_step: self.current_step_id.clone(),
            to_step: next_step_id.to_string(),
            occurred_at: Utc::now(),
            reason: reason.to_string(),
        };

        self.history.push(transition);
        self.current_step_id = Some(next_step_id.to_string());
        self.version += 1;

        Ok(())
    }

    /// Mark workflow as complete (no current step)
    pub fn complete_workflow(&mut self, reason: &str) {
        let transition = StateTransition {
            from_step: self.current_step_id.clone(),
            to_step: "_complete".to_string(),
            occurred_at: Utc::now(),
            reason: reason.to_string(),
        };

        self.history.push(transition);
        self.current_step_id = None;
        self.version += 1;
    }

    /// Get the shared context
    #[must_use]
    pub fn get_context(&self) -> &serde_json::Value {
        &self.context
    }

    /// Set a value in the shared context
    pub fn set_context(&mut self, key: &str, value: serde_json::Value) {
        if let serde_json::Value::Object(ref mut map) = self.context {
            map.insert(key.to_string(), value);
        }
    }

    /// Merge additional data into the context
    pub fn merge_context(&mut self, data: serde_json::Value) {
        if let (serde_json::Value::Object(ref mut ctx), serde_json::Value::Object(other)) =
            (&mut self.context, data)
        {
            for (key, value) in other {
                ctx.insert(key, value);
            }
        }
    }

    /// Create a snapshot for persistence
    #[must_use]
    pub fn to_snapshot(&self) -> WorkflowSnapshot {
        WorkflowSnapshot {
            version: self.version,
            current_step_id: self.current_step_id.clone(),
            step_states: self.step_states.clone(),
            context: self.context.clone(),
            created_at: Utc::now(),
        }
    }

    /// Get the transition history
    #[must_use]
    pub fn get_history(&self) -> &[StateTransition] {
        &self.history
    }

    /// Check if workflow is complete
    #[must_use]
    pub fn is_complete(&self) -> bool {
        self.current_step_id.is_none()
    }

    /// Check if all steps are in terminal states
    #[must_use]
    pub fn all_steps_terminal(&self) -> bool {
        self.step_states
            .values()
            .all(|s| s.is_terminal() || matches!(s, StepState::Pending))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_workflow_state() {
        let state = WorkflowStateManager::new("step1", &["step1", "step2", "step3"]);

        assert_eq!(state.current_step(), Some("step1"));
        assert!(state.get_step_state("step1").unwrap().is_pending());
        assert!(state.get_step_state("step2").unwrap().is_pending());
    }

    #[test]
    fn test_activate_and_complete() {
        let mut state = WorkflowStateManager::new("step1", &["step1", "step2"]);

        // Activate step1
        state.activate_step("step1", vec![]).unwrap();
        assert!(state.get_step_state("step1").unwrap().is_active());

        // Complete step1
        state
            .complete_step("step1", StepResult::approved())
            .unwrap();
        assert!(state.get_step_state("step1").unwrap().is_terminal());
    }

    #[test]
    fn test_context_management() {
        let mut state = WorkflowStateManager::new("step1", &["step1"]);

        state.set_context("key1", serde_json::json!("value1"));
        state.merge_context(serde_json::json!({
            "key2": "value2",
            "key3": 123
        }));

        let ctx = state.get_context();
        assert_eq!(ctx["key1"], "value1");
        assert_eq!(ctx["key2"], "value2");
        assert_eq!(ctx["key3"], 123);
    }

    #[test]
    fn test_snapshot_roundtrip() {
        let mut state = WorkflowStateManager::new("step1", &["step1", "step2"]);
        state.activate_step("step1", vec![]).unwrap();
        state.set_context("test", serde_json::json!("data"));

        let snapshot = state.to_snapshot();
        let restored = WorkflowStateManager::from_snapshot(snapshot);

        assert_eq!(restored.current_step(), Some("step1"));
        assert_eq!(restored.get_context()["test"], "data");
    }

    #[test]
    fn test_retry_step() {
        let mut state = WorkflowStateManager::new("step1", &["step1"]);

        state.activate_step("step1", vec![]).unwrap();
        state.fail_step("step1", "test error").unwrap();

        let retry_count = state.retry_step("step1", 3).unwrap();
        assert_eq!(retry_count, 1);
        assert!(state.get_step_state("step1").unwrap().is_active());
    }

    #[test]
    fn test_max_retries_exceeded() {
        let mut state = WorkflowStateManager::new("step1", &["step1"]);

        // Retry 3 times
        for _ in 0..3 {
            state.activate_step("step1", vec![]).ok();
            state.fail_step("step1", "error").ok();
            state.retry_step("step1", 3).ok();
        }

        // 4th retry should fail
        state.fail_step("step1", "error").ok();
        let result = state.retry_step("step1", 3);
        assert!(matches!(
            result,
            Err(StateTransitionError::MaxRetriesExceeded { .. })
        ));
    }
}
