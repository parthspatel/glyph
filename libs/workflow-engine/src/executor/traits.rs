//! Step executor trait and supporting types

use std::collections::HashMap;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

use glyph_domain::enums::StepType;

use crate::config::StepConfig;
use crate::consensus::ConsensusError;
use crate::state::{StepResult, WorkflowStateManager};

// =============================================================================
// Errors
// =============================================================================

/// Errors that can occur during step execution
#[derive(Debug, Error)]
pub enum ExecutorError {
    /// Configuration error
    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    /// Execution failed
    #[error("Execution failed: {0}")]
    ExecutionFailed(String),

    /// Invalid state for operation
    #[error("Invalid state: {0}")]
    InvalidState(String),

    /// Consensus calculation failed
    #[error("Consensus error: {0}")]
    ConsensusError(#[from] ConsensusError),

    /// Handler not found
    #[error("Handler not found: {0}")]
    HandlerNotFound(String),

    /// Maximum recursion depth exceeded
    #[error("Maximum recursion depth ({max}) exceeded")]
    MaxRecursionDepth { max: u8 },
}

// =============================================================================
// Execution Context
// =============================================================================

/// Data submitted as an annotation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationData {
    /// Unique annotation ID
    pub annotation_id: Uuid,

    /// User who submitted the annotation
    pub user_id: Uuid,

    /// Annotation content
    pub data: serde_json::Value,

    /// When the annotation was submitted
    pub submitted_at: DateTime<Utc>,

    /// Optional decision for review steps
    pub decision: Option<ReviewDecision>,
}

/// Decision made during review
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReviewDecision {
    Approved,
    Rejected,
    NeedsRevision,
}

/// Context available to step executors
#[derive(Debug)]
pub struct ExecutionContext<'a> {
    /// Task being executed
    pub task_id: Uuid,

    /// Current step ID
    pub step_id: String,

    /// Step configuration
    pub step_config: &'a StepConfig,

    /// Current workflow state
    pub workflow_state: &'a WorkflowStateManager,

    /// Annotations submitted for this step
    pub annotations: Vec<AnnotationData>,

    /// Results from previous steps
    pub previous_results: HashMap<String, StepResult>,

    /// Current user ID (for permission checks)
    pub current_user_id: Option<Uuid>,

    /// Current user roles (for permission checks)
    pub current_user_roles: Vec<String>,
}

impl<'a> ExecutionContext<'a> {
    /// Create a new execution context
    #[must_use]
    pub fn new(
        task_id: Uuid,
        step_id: String,
        step_config: &'a StepConfig,
        workflow_state: &'a WorkflowStateManager,
    ) -> Self {
        Self {
            task_id,
            step_id,
            step_config,
            workflow_state,
            annotations: Vec::new(),
            previous_results: HashMap::new(),
            current_user_id: None,
            current_user_roles: Vec::new(),
        }
    }

    /// Add annotations to the context
    pub fn with_annotations(mut self, annotations: Vec<AnnotationData>) -> Self {
        self.annotations = annotations;
        self
    }

    /// Add previous results to the context
    pub fn with_previous_results(mut self, results: HashMap<String, StepResult>) -> Self {
        self.previous_results = results;
        self
    }

    /// Set current user for permission checks
    pub fn with_user(mut self, user_id: Uuid, roles: Vec<String>) -> Self {
        self.current_user_id = Some(user_id);
        self.current_user_roles = roles;
        self
    }
}

// =============================================================================
// Execution Result
// =============================================================================

/// Result of executing a step
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum ExecutionResult {
    /// Step is waiting for more input
    Waiting {
        /// Reason why step is still waiting
        reason: String,
    },

    /// Step completed successfully
    Complete {
        /// Step result
        result: StepResult,
    },

    /// Step failed
    Failed {
        /// Error message
        error: String,
        /// Whether the step can be retried
        retryable: bool,
    },
}

impl ExecutionResult {
    /// Create a waiting result
    #[must_use]
    pub fn waiting(reason: impl Into<String>) -> Self {
        Self::Waiting {
            reason: reason.into(),
        }
    }

    /// Create a complete result
    #[must_use]
    pub fn complete(result: StepResult) -> Self {
        Self::Complete { result }
    }

    /// Create a failed result
    #[must_use]
    pub fn failed(error: impl Into<String>, retryable: bool) -> Self {
        Self::Failed {
            error: error.into(),
            retryable,
        }
    }

    /// Check if waiting
    #[must_use]
    pub fn is_waiting(&self) -> bool {
        matches!(self, Self::Waiting { .. })
    }

    /// Check if complete
    #[must_use]
    pub fn is_complete(&self) -> bool {
        matches!(self, Self::Complete { .. })
    }

    /// Check if failed
    #[must_use]
    pub fn is_failed(&self) -> bool {
        matches!(self, Self::Failed { .. })
    }
}

// =============================================================================
// Step Executor Trait
// =============================================================================

/// Trait for step executors
#[async_trait]
pub trait StepExecutor: Send + Sync {
    /// Execute the step
    async fn execute(&self, ctx: &ExecutionContext<'_>) -> Result<ExecutionResult, ExecutorError>;

    /// Get the step type this executor handles
    fn step_type(&self) -> StepType;

    /// Check if this step can be executed in the current context
    fn can_execute(&self, ctx: &ExecutionContext<'_>) -> bool {
        // Default: step must be active
        ctx.workflow_state
            .get_step_state(&ctx.step_id)
            .map(|s| s.is_active())
            .unwrap_or(false)
    }
}
