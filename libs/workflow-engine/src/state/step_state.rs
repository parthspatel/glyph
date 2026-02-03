//! Step state enum with transition guards
//!
//! Per RESEARCH.md, uses enum-based states (not type-state) for runtime
//! flexibility with YAML-defined dynamic workflows.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

// =============================================================================
// Errors
// =============================================================================

/// Errors that can occur during state transitions
#[derive(Debug, Error)]
pub enum StateTransitionError {
    /// Invalid state transition attempted
    #[error("Invalid transition from {from} to {to}")]
    InvalidTransition { from: String, to: String },

    /// Step not found in workflow
    #[error("Step not found: {0}")]
    StepNotFound(String),

    /// Maximum retries exceeded
    #[error("Maximum retries ({max}) exceeded for step")]
    MaxRetriesExceeded { max: u8 },
}

// =============================================================================
// Step State
// =============================================================================

/// State of a workflow step
///
/// Uses tagged enum serialization for event sourcing compatibility.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum StepState {
    /// Step is waiting to be activated
    Pending,

    /// Step is currently being worked on
    Active {
        started_at: DateTime<Utc>,
        assigned_to: Vec<Uuid>,
        last_activity: DateTime<Utc>,
    },

    /// Step completed successfully
    Completed {
        completed_at: DateTime<Utc>,
        result: StepResult,
    },

    /// Step was skipped (e.g., conditional branch not taken)
    Skipped {
        reason: String,
        skipped_at: DateTime<Utc>,
    },

    /// Step failed after retries exhausted
    Failed {
        error: String,
        retries: u8,
        failed_at: DateTime<Utc>,
    },
}

impl StepState {
    /// Check if transition to target state is allowed
    #[must_use]
    pub fn can_transition_to(&self, target: &StepState) -> bool {
        use StepState::{Active, Completed, Failed, Pending, Skipped};

        matches!(
            (self, target),
            // From Pending
            (Pending, Active { .. })
            | (Pending, Skipped { .. })
            // From Active
            | (Active { .. }, Completed { .. })
            | (Active { .. }, Failed { .. })
            | (Active { .. }, Skipped { .. })
            // From Failed (retry or give up)
            | (Failed { .. }, Active { .. })
            | (Failed { .. }, Skipped { .. })
        )
    }

    /// Check if this is a terminal state
    #[must_use]
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed { .. } | Self::Skipped { .. })
    }

    /// Check if step is currently active
    #[must_use]
    pub fn is_active(&self) -> bool {
        matches!(self, Self::Active { .. })
    }

    /// Check if step is pending
    #[must_use]
    pub fn is_pending(&self) -> bool {
        matches!(self, Self::Pending)
    }

    /// Check if step has failed
    #[must_use]
    pub fn is_failed(&self) -> bool {
        matches!(self, Self::Failed { .. })
    }

    /// Get the retry count if in failed state
    #[must_use]
    pub fn retry_count(&self) -> Option<u8> {
        match self {
            Self::Failed { retries, .. } => Some(*retries),
            _ => None,
        }
    }

    /// Get the result if completed
    #[must_use]
    pub fn result(&self) -> Option<&StepResult> {
        match self {
            Self::Completed { result, .. } => Some(result),
            _ => None,
        }
    }

    /// Get last activity timestamp for timeout checking
    #[must_use]
    pub fn last_activity(&self) -> Option<DateTime<Utc>> {
        match self {
            Self::Active { last_activity, .. } => Some(*last_activity),
            _ => None,
        }
    }

    /// Get the status name as a string
    #[must_use]
    pub fn status_name(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Active { .. } => "active",
            Self::Completed { .. } => "completed",
            Self::Skipped { .. } => "skipped",
            Self::Failed { .. } => "failed",
        }
    }
}

impl Default for StepState {
    fn default() -> Self {
        Self::Pending
    }
}

// =============================================================================
// Step Result
// =============================================================================

/// Result of completing a step
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StepResult {
    /// Annotations were submitted
    Submitted { annotations: Vec<Uuid> },

    /// Review approved the annotations
    Approved,

    /// Review rejected the annotations
    Rejected { reason: String },

    /// Consensus was reached
    Consensus {
        /// Agreement score (0.0 to 1.0)
        agreement: f64,
        /// How consensus was resolved
        resolved_by: String,
    },

    /// Auto-process handler completed
    AutoProcessed { output: serde_json::Value },

    /// Conditional step evaluated
    ConditionMet {
        /// Which branch was taken
        branch: String,
    },

    /// Sub-workflow completed
    SubWorkflowCompleted { output: serde_json::Value },
}

impl StepResult {
    /// Create a submitted result
    #[must_use]
    pub fn submitted(annotations: Vec<Uuid>) -> Self {
        Self::Submitted { annotations }
    }

    /// Create an approved result
    #[must_use]
    pub fn approved() -> Self {
        Self::Approved
    }

    /// Create a rejected result
    #[must_use]
    pub fn rejected(reason: impl Into<String>) -> Self {
        Self::Rejected {
            reason: reason.into(),
        }
    }

    /// Create a consensus result
    #[must_use]
    pub fn consensus(agreement: f64, resolved_by: impl Into<String>) -> Self {
        Self::Consensus {
            agreement,
            resolved_by: resolved_by.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_transitions() {
        let pending = StepState::Pending;
        let active = StepState::Active {
            started_at: Utc::now(),
            assigned_to: vec![],
            last_activity: Utc::now(),
        };
        let completed = StepState::Completed {
            completed_at: Utc::now(),
            result: StepResult::approved(),
        };
        let failed = StepState::Failed {
            error: "test".to_string(),
            retries: 1,
            failed_at: Utc::now(),
        };

        // Valid transitions
        assert!(pending.can_transition_to(&active));
        assert!(active.can_transition_to(&completed));
        assert!(active.can_transition_to(&failed));
        assert!(failed.can_transition_to(&active)); // Retry

        // Invalid transitions
        assert!(!pending.can_transition_to(&completed));
        assert!(!completed.can_transition_to(&active));
    }

    #[test]
    fn test_terminal_states() {
        let completed = StepState::Completed {
            completed_at: Utc::now(),
            result: StepResult::approved(),
        };
        let skipped = StepState::Skipped {
            reason: "test".to_string(),
            skipped_at: Utc::now(),
        };

        assert!(completed.is_terminal());
        assert!(skipped.is_terminal());
        assert!(!StepState::Pending.is_terminal());
    }

    #[test]
    fn test_step_result_serialization() {
        let result = StepResult::consensus(0.85, "majority_vote");
        let json = serde_json::to_string(&result).unwrap();

        assert!(json.contains("consensus"));
        assert!(json.contains("0.85"));
    }
}
