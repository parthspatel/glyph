//! Task assignment service

use async_trait::async_trait;
use glyph_domain::{AssignmentMode, LoadBalancingStrategy, Task, TaskAssignment, User};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum AssignmentError {
    #[error("No eligible users found for assignment")]
    NoEligibleUsers,

    #[error("User {0} is not eligible for this task")]
    UserNotEligible(Uuid),

    #[error("Task {0} is not available for assignment")]
    TaskNotAvailable(Uuid),

    #[error("Assignment limit reached for user {0}")]
    AssignmentLimitReached(Uuid),

    #[error("Database error: {0}")]
    DatabaseError(String),
}

/// Service for assigning tasks to users
#[async_trait]
pub trait AssignmentService: Send + Sync {
    /// Find the best user to assign a task to
    async fn find_best_assignee(
        &self,
        task: &Task,
        step_id: &str,
        mode: AssignmentMode,
        strategy: LoadBalancingStrategy,
    ) -> Result<User, AssignmentError>;

    /// Assign a task to a specific user
    async fn assign_task(
        &self,
        task_id: Uuid,
        step_id: &str,
        user_id: Uuid,
    ) -> Result<TaskAssignment, AssignmentError>;

    /// Get current assignments for a user
    async fn get_user_assignments(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<TaskAssignment>, AssignmentError>;

    /// Release an assignment (e.g., on timeout)
    async fn release_assignment(&self, assignment_id: Uuid) -> Result<(), AssignmentError>;
}
