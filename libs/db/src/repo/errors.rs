//! Per-operation repository errors
//!
//! Each repository operation has its own error type for precise error handling.

use glyph_domain::{AnnotationId, ProjectId, TaskId, TeamId, UserId, WorkflowId};
use thiserror::Error;

// =============================================================================
// User Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum CreateUserError {
    #[error("email already exists: {0}")]
    EmailExists(String),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum FindUserError {
    #[error("user not found: {0}")]
    NotFound(UserId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum UpdateUserError {
    #[error("user not found: {0}")]
    NotFound(UserId),
    #[error("email already exists: {0}")]
    EmailExists(String),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum ListUsersError {
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// =============================================================================
// Team Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum CreateTeamError {
    #[error("team name already exists: {0}")]
    NameExists(String),
    #[error("leader not found: {0}")]
    LeaderNotFound(UserId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum FindTeamError {
    #[error("team not found: {0}")]
    NotFound(TeamId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum UpdateTeamError {
    #[error("team not found: {0}")]
    NotFound(TeamId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum TeamMembershipError {
    #[error("team not found: {0}")]
    TeamNotFound(TeamId),
    #[error("user not found: {0}")]
    UserNotFound(UserId),
    #[error("user already a member")]
    AlreadyMember,
    #[error("user not a member")]
    NotAMember,
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// =============================================================================
// Project Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum CreateProjectError {
    #[error("project name already exists: {0}")]
    NameExists(String),
    #[error("workflow not found: {0}")]
    WorkflowNotFound(WorkflowId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum FindProjectError {
    #[error("project not found: {0}")]
    NotFound(ProjectId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum UpdateProjectError {
    #[error("project not found: {0}")]
    NotFound(ProjectId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// =============================================================================
// Task Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum CreateTaskError {
    #[error("project not found: {0}")]
    ProjectNotFound(ProjectId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum FindTaskError {
    #[error("task not found: {0}")]
    NotFound(TaskId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum UpdateTaskError {
    #[error("task not found: {0}")]
    NotFound(TaskId),
    #[error("invalid status transition")]
    InvalidStatusTransition,
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// =============================================================================
// Annotation Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum CreateAnnotationError {
    #[error("task not found: {0}")]
    TaskNotFound(TaskId),
    #[error("user not found: {0}")]
    UserNotFound(UserId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum FindAnnotationError {
    #[error("annotation not found: {0}")]
    NotFound(AnnotationId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum UpdateAnnotationError {
    #[error("annotation not found: {0}")]
    NotFound(AnnotationId),
    #[error("annotation is not in draft status")]
    NotDraft,
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// =============================================================================
// Workflow Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum FindWorkflowError {
    #[error("workflow not found: {0}")]
    NotFound(WorkflowId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum CreateWorkflowError {
    #[error("workflow name already exists: {0}")]
    NameExists(String),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// =============================================================================
// Skill Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum CreateSkillTypeError {
    #[error("skill type already exists: {0}")]
    AlreadyExists(String),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum FindSkillTypeError {
    #[error("skill type not found: {0}")]
    NotFound(String),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum UpdateSkillTypeError {
    #[error("skill type not found: {0}")]
    NotFound(String),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum CertifySkillError {
    #[error("skill type not found: {0}")]
    SkillTypeNotFound(String),
    #[error("user not found: {0}")]
    UserNotFound(UserId),
    #[error("invalid proficiency level")]
    InvalidProficiency,
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum RevokeSkillError {
    #[error("certification not found")]
    NotFound,
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// =============================================================================
// Project Type Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum CreateProjectTypeError {
    #[error("project type name already exists: {0}")]
    NameExists(String),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum FindProjectTypeError {
    #[error("project type not found: {0}")]
    NotFound(glyph_domain::ProjectTypeId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum UpdateProjectTypeError {
    #[error("project type not found: {0}")]
    NotFound(glyph_domain::ProjectTypeId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum DeleteProjectTypeError {
    #[error("project type not found: {0}")]
    NotFound(glyph_domain::ProjectTypeId),
    #[error("project type is in use by projects")]
    InUse,
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum AddSkillRequirementError {
    #[error("project type not found")]
    ProjectTypeNotFound,
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum RemoveSkillRequirementError {
    #[error("skill requirement not found")]
    NotFound,
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// =============================================================================
// Data Source Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum CreateDataSourceError {
    #[error("data source name already exists: {0}")]
    NameExists(String),
    #[error("project not found: {0}")]
    ProjectNotFound(glyph_domain::ProjectId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum FindDataSourceError {
    #[error("data source not found: {0}")]
    NotFound(glyph_domain::DataSourceId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum UpdateDataSourceError {
    #[error("data source not found: {0}")]
    NotFound(glyph_domain::DataSourceId),
    #[error("data source name already exists: {0}")]
    NameExists(String),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum DeleteDataSourceError {
    #[error("data source not found: {0}")]
    NotFound(glyph_domain::DataSourceId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

// =============================================================================
// Assignment Repository Errors
// =============================================================================

#[derive(Debug, Error)]
pub enum FindAssignmentError {
    #[error("assignment not found: {0}")]
    NotFound(glyph_domain::AssignmentId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum CreateAssignmentError {
    #[error("duplicate assignment: user already assigned to this task/step")]
    DuplicateAssignment,
    #[error("task not found: {0}")]
    TaskNotFound(glyph_domain::TaskId),
    #[error("user not found: {0}")]
    UserNotFound(glyph_domain::UserId),
    #[error("database error")]
    Database(#[source] sqlx::Error),
}

#[derive(Debug, Error)]
pub enum UpdateAssignmentError {
    #[error("assignment not found: {0}")]
    NotFound(glyph_domain::AssignmentId),
    #[error("invalid status transition from {from} to {to}")]
    InvalidStatusTransition { from: String, to: String },
    #[error("database error")]
    Database(#[source] sqlx::Error),
}
