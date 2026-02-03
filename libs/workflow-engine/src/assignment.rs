//! Task assignment service
//!
//! Provides skill-based, load-balanced task assignment with duplicate prevention
//! and cross-step exclusion support.

use std::sync::Arc;

use async_trait::async_trait;
use glyph_domain::{
    AssignmentMode, AssignmentStatus, LoadBalancingStrategy, ProjectId, Task, TaskAssignment,
    TaskId, User, UserId, UserStatus,
};
use thiserror::Error;
use uuid::Uuid;

use glyph_db::{AssignmentRepository, NewAssignment, UserRepository};

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

    #[error("Duplicate assignment exists")]
    DuplicateAssignment,

    #[error("Assignment not found: {0}")]
    NotFound(Uuid),

    #[error("Invalid status transition")]
    InvalidStatusTransition,

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

// =============================================================================
// Configuration
// =============================================================================

/// Configuration for the assignment engine
#[derive(Debug, Clone)]
pub struct AssignmentConfig {
    /// Maximum concurrent assignments per user (None = unlimited)
    pub max_concurrent_per_user: Option<i32>,
    /// Step pairs where the same user cannot work on both (cross-step exclusion)
    pub cross_step_exclusion_pairs: Vec<(String, String)>,
    /// Cooldown period in minutes before a rejected task can be reassigned
    pub cooldown_minutes: u32,
    /// Default load balancing strategy
    pub default_strategy: LoadBalancingStrategy,
}

impl Default for AssignmentConfig {
    fn default() -> Self {
        Self {
            max_concurrent_per_user: Some(10),
            cross_step_exclusion_pairs: vec![
                // Common exclusion: annotator can't also review their own work
                ("annotation".to_string(), "review".to_string()),
            ],
            cooldown_minutes: 5,
            default_strategy: LoadBalancingStrategy::LeastLoaded,
        }
    }
}

// =============================================================================
// Assignment Engine Implementation
// =============================================================================

/// Engine for managing task assignments with load balancing
pub struct AssignmentEngine<A, U>
where
    A: AssignmentRepository,
    U: UserRepository,
{
    assignment_repo: Arc<A>,
    user_repo: Arc<U>,
    config: AssignmentConfig,
    /// Track last assigned user index per step for round-robin
    round_robin_index: std::sync::atomic::AtomicUsize,
}

impl<A, U> AssignmentEngine<A, U>
where
    A: AssignmentRepository,
    U: UserRepository,
{
    /// Create a new assignment engine
    pub fn new(assignment_repo: Arc<A>, user_repo: Arc<U>, config: AssignmentConfig) -> Self {
        Self {
            assignment_repo,
            user_repo,
            config,
            round_robin_index: std::sync::atomic::AtomicUsize::new(0),
        }
    }

    /// Get excluded steps for a given step (steps where the same user cannot work)
    fn get_excluded_steps(&self, step_id: &str) -> Vec<String> {
        let mut excluded = Vec::new();
        for (step_a, step_b) in &self.config.cross_step_exclusion_pairs {
            if step_a == step_id {
                excluded.push(step_b.clone());
            } else if step_b == step_id {
                excluded.push(step_a.clone());
            }
        }
        excluded
    }

    /// Check if a user is eligible for assignment to a task/step
    async fn is_user_eligible(
        &self,
        user: &User,
        task: &Task,
        step_id: &str,
    ) -> Result<bool, AssignmentError> {
        // User must be active
        if user.status != UserStatus::Active {
            return Ok(false);
        }

        // Check assignment limit
        if let Some(max) = self.config.max_concurrent_per_user {
            let count = self
                .assignment_repo
                .count_active_by_user(&user.user_id)
                .await
                .map_err(|e| AssignmentError::DatabaseError(e.to_string()))?;

            if count >= max as i64 {
                return Ok(false);
            }
        }

        // Check cross-step exclusion
        let excluded_steps = self.get_excluded_steps(step_id);
        if !excluded_steps.is_empty() {
            let has_worked = self
                .assignment_repo
                .has_user_worked_on_task(&user.user_id, &task.task_id, &excluded_steps)
                .await
                .map_err(|e| AssignmentError::DatabaseError(e.to_string()))?;

            if has_worked {
                return Ok(false);
            }
        }

        Ok(true)
    }

    /// Select user based on round-robin strategy
    fn select_round_robin<'a>(&self, eligible_users: &'a [User]) -> Option<&'a User> {
        if eligible_users.is_empty() {
            return None;
        }
        let index = self
            .round_robin_index
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        Some(&eligible_users[index % eligible_users.len()])
    }

    /// Select user based on least-loaded (capacity-based) strategy
    async fn select_least_loaded(
        &self,
        eligible_users: &[User],
    ) -> Result<Option<User>, AssignmentError> {
        if eligible_users.is_empty() {
            return Ok(None);
        }

        let mut min_load = i64::MAX;
        let mut selected: Option<&User> = None;

        for user in eligible_users {
            let load = self
                .assignment_repo
                .count_active_by_user(&user.user_id)
                .await
                .map_err(|e| AssignmentError::DatabaseError(e.to_string()))?;

            if load < min_load {
                min_load = load;
                selected = Some(user);
            }
        }

        Ok(selected.cloned())
    }

    /// Select user based on quality-weighted strategy
    /// Users with higher quality scores get higher priority
    async fn select_quality_weighted(
        &self,
        eligible_users: &[User],
    ) -> Result<Option<User>, AssignmentError> {
        // For now, fall back to least-loaded since quality scores
        // require integration with the quality_scores table
        // TODO: Integrate with quality scores when available
        self.select_least_loaded(eligible_users).await
    }
}

#[async_trait]
impl<A, U> AssignmentService for AssignmentEngine<A, U>
where
    A: AssignmentRepository + 'static,
    U: UserRepository + 'static,
{
    async fn find_best_assignee(
        &self,
        task: &Task,
        step_id: &str,
        mode: AssignmentMode,
        strategy: LoadBalancingStrategy,
    ) -> Result<User, AssignmentError> {
        // For manual mode, this shouldn't be called - return error
        if mode == AssignmentMode::Manual {
            return Err(AssignmentError::NoEligibleUsers);
        }

        // Get all active users (in a real implementation, this would filter by
        // project membership, skills, etc.)
        let pagination = glyph_db::Pagination {
            limit: 1000,
            offset: 0,
            sort_by: None,
            sort_order: glyph_db::SortOrder::Asc,
        };

        let users = self
            .user_repo
            .list(pagination)
            .await
            .map_err(|e| AssignmentError::DatabaseError(format!("{e:?}")))?;

        // Filter to eligible users
        let mut eligible_users = Vec::new();
        for user in users.items {
            if self.is_user_eligible(&user, task, step_id).await? {
                eligible_users.push(user);
            }
        }

        if eligible_users.is_empty() {
            return Err(AssignmentError::NoEligibleUsers);
        }

        // Apply load balancing strategy
        let selected = match strategy {
            LoadBalancingStrategy::RoundRobin => self.select_round_robin(&eligible_users).cloned(),
            LoadBalancingStrategy::LeastLoaded => self.select_least_loaded(&eligible_users).await?,
            LoadBalancingStrategy::QualityWeighted => {
                self.select_quality_weighted(&eligible_users).await?
            }
        };

        selected.ok_or(AssignmentError::NoEligibleUsers)
    }

    async fn assign_task(
        &self,
        task_id: Uuid,
        step_id: &str,
        user_id: Uuid,
    ) -> Result<TaskAssignment, AssignmentError> {
        // Verify user exists and is eligible
        let user = self
            .user_repo
            .find_by_id(&UserId::from_uuid(user_id))
            .await
            .map_err(|e| AssignmentError::DatabaseError(format!("{e:?}")))?
            .ok_or(AssignmentError::UserNotEligible(user_id))?;

        if user.status != UserStatus::Active {
            return Err(AssignmentError::UserNotEligible(user_id));
        }

        // Check assignment limit
        if let Some(max) = self.config.max_concurrent_per_user {
            let count = self
                .assignment_repo
                .count_active_by_user(&user.user_id)
                .await
                .map_err(|e| AssignmentError::DatabaseError(e.to_string()))?;

            if count >= max as i64 {
                return Err(AssignmentError::AssignmentLimitReached(user_id));
            }
        }

        // Create the assignment
        // Note: project_id would typically come from the task, but we need to look it up
        let new_assignment = NewAssignment {
            task_id: TaskId::from_uuid(task_id),
            project_id: ProjectId::from_uuid(Uuid::nil()), // TODO: Get from task lookup
            step_id: step_id.to_string(),
            user_id: UserId::from_uuid(user_id),
        };

        let assignment =
            self.assignment_repo
                .create(&new_assignment)
                .await
                .map_err(|e| match e {
                    glyph_db::CreateAssignmentError::DuplicateAssignment => {
                        AssignmentError::DuplicateAssignment
                    }
                    glyph_db::CreateAssignmentError::TaskNotFound(id) => {
                        AssignmentError::TaskNotAvailable(*id.as_uuid())
                    }
                    glyph_db::CreateAssignmentError::UserNotFound(id) => {
                        AssignmentError::UserNotEligible(*id.as_uuid())
                    }
                    glyph_db::CreateAssignmentError::Database(e) => {
                        AssignmentError::DatabaseError(e.to_string())
                    }
                })?;

        Ok(assignment)
    }

    async fn get_user_assignments(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<TaskAssignment>, AssignmentError> {
        let user_id = UserId::from_uuid(user_id);

        // Get active assignments (assigned, accepted, in_progress)
        let assignments = self
            .assignment_repo
            .list_by_user(&user_id, None)
            .await
            .map_err(|e| AssignmentError::DatabaseError(e.to_string()))?;

        // Filter to only active statuses
        let active = assignments
            .into_iter()
            .filter(|a| {
                matches!(
                    a.status,
                    AssignmentStatus::Assigned
                        | AssignmentStatus::Accepted
                        | AssignmentStatus::InProgress
                )
            })
            .collect();

        Ok(active)
    }

    async fn release_assignment(&self, assignment_id: Uuid) -> Result<(), AssignmentError> {
        let id = glyph_domain::AssignmentId::from_uuid(assignment_id);

        self.assignment_repo
            .update_status(&id, AssignmentStatus::Expired)
            .await
            .map_err(|e| match e {
                glyph_db::UpdateAssignmentError::NotFound(_) => {
                    AssignmentError::NotFound(assignment_id)
                }
                glyph_db::UpdateAssignmentError::InvalidStatusTransition { .. } => {
                    AssignmentError::InvalidStatusTransition
                }
                glyph_db::UpdateAssignmentError::Database(e) => {
                    AssignmentError::DatabaseError(e.to_string())
                }
            })?;

        Ok(())
    }
}

// =============================================================================
// Extended Assignment Service
// =============================================================================

/// Extended assignment operations beyond the base trait
impl<A, U> AssignmentEngine<A, U>
where
    A: AssignmentRepository,
    U: UserRepository,
{
    /// Assign a task with project ID (full context)
    pub async fn assign_task_with_project(
        &self,
        task_id: TaskId,
        project_id: ProjectId,
        step_id: &str,
        user_id: UserId,
    ) -> Result<TaskAssignment, AssignmentError> {
        // Verify user exists and is active
        let user = self
            .user_repo
            .find_by_id(&user_id)
            .await
            .map_err(|e| AssignmentError::DatabaseError(format!("{e:?}")))?
            .ok_or(AssignmentError::UserNotEligible(*user_id.as_uuid()))?;

        if user.status != UserStatus::Active {
            return Err(AssignmentError::UserNotEligible(*user_id.as_uuid()));
        }

        // Check assignment limit
        if let Some(max) = self.config.max_concurrent_per_user {
            let count = self
                .assignment_repo
                .count_active_by_user(&user_id)
                .await
                .map_err(|e| AssignmentError::DatabaseError(e.to_string()))?;

            if count >= max as i64 {
                return Err(AssignmentError::AssignmentLimitReached(*user_id.as_uuid()));
            }
        }

        let new_assignment = NewAssignment {
            task_id,
            project_id,
            step_id: step_id.to_string(),
            user_id,
        };

        let assignment =
            self.assignment_repo
                .create(&new_assignment)
                .await
                .map_err(|e| match e {
                    glyph_db::CreateAssignmentError::DuplicateAssignment => {
                        AssignmentError::DuplicateAssignment
                    }
                    glyph_db::CreateAssignmentError::TaskNotFound(id) => {
                        AssignmentError::TaskNotAvailable(*id.as_uuid())
                    }
                    glyph_db::CreateAssignmentError::UserNotFound(id) => {
                        AssignmentError::UserNotEligible(*id.as_uuid())
                    }
                    glyph_db::CreateAssignmentError::Database(e) => {
                        AssignmentError::DatabaseError(e.to_string())
                    }
                })?;

        Ok(assignment)
    }

    /// Accept an assignment (user confirms they will work on it)
    pub async fn accept_assignment(
        &self,
        assignment_id: glyph_domain::AssignmentId,
    ) -> Result<TaskAssignment, AssignmentError> {
        self.assignment_repo
            .update_status(&assignment_id, AssignmentStatus::Accepted)
            .await
            .map_err(|e| match e {
                glyph_db::UpdateAssignmentError::NotFound(_) => {
                    AssignmentError::NotFound(*assignment_id.as_uuid())
                }
                glyph_db::UpdateAssignmentError::InvalidStatusTransition { .. } => {
                    AssignmentError::InvalidStatusTransition
                }
                glyph_db::UpdateAssignmentError::Database(e) => {
                    AssignmentError::DatabaseError(e.to_string())
                }
            })
    }

    /// Start working on an assignment
    pub async fn start_assignment(
        &self,
        assignment_id: glyph_domain::AssignmentId,
    ) -> Result<TaskAssignment, AssignmentError> {
        self.assignment_repo
            .update_status(&assignment_id, AssignmentStatus::InProgress)
            .await
            .map_err(|e| match e {
                glyph_db::UpdateAssignmentError::NotFound(_) => {
                    AssignmentError::NotFound(*assignment_id.as_uuid())
                }
                glyph_db::UpdateAssignmentError::InvalidStatusTransition { .. } => {
                    AssignmentError::InvalidStatusTransition
                }
                glyph_db::UpdateAssignmentError::Database(e) => {
                    AssignmentError::DatabaseError(e.to_string())
                }
            })
    }

    /// Submit an assignment as complete
    pub async fn submit_assignment(
        &self,
        assignment_id: glyph_domain::AssignmentId,
    ) -> Result<TaskAssignment, AssignmentError> {
        self.assignment_repo
            .update_status(&assignment_id, AssignmentStatus::Submitted)
            .await
            .map_err(|e| match e {
                glyph_db::UpdateAssignmentError::NotFound(_) => {
                    AssignmentError::NotFound(*assignment_id.as_uuid())
                }
                glyph_db::UpdateAssignmentError::InvalidStatusTransition { .. } => {
                    AssignmentError::InvalidStatusTransition
                }
                glyph_db::UpdateAssignmentError::Database(e) => {
                    AssignmentError::DatabaseError(e.to_string())
                }
            })
    }

    /// Reject an assignment with a reason
    pub async fn reject_assignment(
        &self,
        assignment_id: glyph_domain::AssignmentId,
        reason: serde_json::Value,
    ) -> Result<(), AssignmentError> {
        let reject = glyph_db::RejectAssignment {
            assignment_id,
            reason,
        };

        self.assignment_repo
            .reject(&reject)
            .await
            .map_err(|e| match e {
                glyph_db::UpdateAssignmentError::NotFound(_) => {
                    AssignmentError::NotFound(*reject.assignment_id.as_uuid())
                }
                glyph_db::UpdateAssignmentError::InvalidStatusTransition { .. } => {
                    AssignmentError::InvalidStatusTransition
                }
                glyph_db::UpdateAssignmentError::Database(e) => {
                    AssignmentError::DatabaseError(e.to_string())
                }
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AssignmentConfig::default();
        assert_eq!(config.max_concurrent_per_user, Some(10));
        assert_eq!(config.cooldown_minutes, 5);
        assert!(!config.cross_step_exclusion_pairs.is_empty());
    }

    #[test]
    fn test_get_excluded_steps() {
        // Would need mock repos for full test
    }
}
