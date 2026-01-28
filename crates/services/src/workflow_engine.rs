//! Workflow execution engine

use async_trait::async_trait;
use glyph_domain::{Task, Workflow, WorkflowState};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum WorkflowError {
    #[error("Workflow {0} not found")]
    WorkflowNotFound(Uuid),

    #[error("Invalid transition from {0} to {1}")]
    InvalidTransition(String, String),

    #[error("Step {0} not found in workflow")]
    StepNotFound(String),

    #[error("Workflow is in terminal state")]
    TerminalState,

    #[error("Condition evaluation failed: {0}")]
    ConditionError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),
}

/// Engine for executing workflows
#[async_trait]
pub trait WorkflowEngine: Send + Sync {
    /// Initialize a task with a workflow
    async fn initialize_task(
        &self,
        task: &mut Task,
        workflow: &Workflow,
    ) -> Result<(), WorkflowError>;

    /// Advance the task to the next step
    async fn advance(
        &self,
        task: &mut Task,
        workflow: &Workflow,
    ) -> Result<Option<String>, WorkflowError>;

    /// Check if a task can transition to a specific step
    async fn can_transition(
        &self,
        task: &Task,
        workflow: &Workflow,
        to_step_id: &str,
    ) -> Result<bool, WorkflowError>;

    /// Get the current state of a task's workflow
    fn get_state(&self, task: &Task) -> &WorkflowState;

    /// Check if the workflow is complete
    fn is_complete(&self, task: &Task, workflow: &Workflow) -> bool;
}
