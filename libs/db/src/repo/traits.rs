//! Repository trait definitions
//!
//! These traits define the interface for data access operations.
//! Implementations are provided for PostgreSQL in separate modules.

use async_trait::async_trait;
use glyph_domain::{
    Annotation, AnnotationStatus, Project, ProjectStatus, Task, TaskStatus, Team, TeamMembership,
    TeamRole, TeamStatus, User, UserStatus, Workflow,
};
use glyph_domain::{AnnotationId, AssignmentId, ProjectId, TaskId, TeamId, UserId, WorkflowId};

use crate::pagination::{Page, Pagination};
use crate::repo::errors::*;

// =============================================================================
// Input Types
// =============================================================================

/// Input for creating a new user
#[derive(Debug, Clone)]
pub struct NewUser {
    pub email: String,
    pub display_name: String,
}

/// Input for updating a user
#[derive(Debug, Clone, Default)]
pub struct UserUpdate {
    pub display_name: Option<String>,
    pub status: Option<UserStatus>,
}

/// Input for creating a new team
#[derive(Debug, Clone)]
pub struct NewTeam {
    pub name: String,
    pub description: Option<String>,
    pub leader_id: UserId,
    pub capacity: Option<i32>,
    pub specializations: Vec<String>,
}

/// Input for updating a team
#[derive(Debug, Clone, Default)]
pub struct TeamUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub leader_id: Option<UserId>,
    pub status: Option<TeamStatus>,
    pub capacity: Option<i32>,
}

/// Input for creating a new project
#[derive(Debug, Clone)]
pub struct NewProject {
    pub name: String,
    pub description: Option<String>,
    pub workflow_id: WorkflowId,
    pub layout_id: String,
    pub created_by: UserId,
}

/// Input for updating a project
#[derive(Debug, Clone, Default)]
pub struct ProjectUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<ProjectStatus>,
}

/// Input for creating a new task
#[derive(Debug, Clone)]
pub struct NewTask {
    pub project_id: ProjectId,
    pub input_data: serde_json::Value,
    pub priority: Option<i32>,
    pub metadata: Option<serde_json::Value>,
}

/// Input for updating a task
#[derive(Debug, Clone, Default)]
pub struct TaskUpdate {
    pub status: Option<TaskStatus>,
    pub priority: Option<i32>,
    pub metadata: Option<serde_json::Value>,
}

/// Input for creating a new annotation
#[derive(Debug, Clone)]
pub struct NewAnnotation {
    pub task_id: TaskId,
    pub step_id: String,
    pub user_id: UserId,
    pub assignment_id: AssignmentId,
    pub project_id: ProjectId,
    pub data: serde_json::Value,
}

/// Input for updating an annotation
#[derive(Debug, Clone, Default)]
pub struct AnnotationUpdate {
    pub data: Option<serde_json::Value>,
    pub status: Option<AnnotationStatus>,
}

// =============================================================================
// Repository Traits
// =============================================================================

/// Repository for user operations
#[async_trait]
pub trait UserRepository: Send + Sync {
    /// Find a user by ID
    async fn find_by_id(&self, id: &UserId) -> Result<Option<User>, FindUserError>;

    /// Find a user by email
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, FindUserError>;

    /// Create a new user
    async fn create(&self, user: &NewUser) -> Result<User, CreateUserError>;

    /// Update an existing user
    async fn update(&self, id: &UserId, update: &UserUpdate) -> Result<User, UpdateUserError>;

    /// List users with pagination
    async fn list(&self, pagination: Pagination) -> Result<Page<User>, ListUsersError>;

    /// Soft delete a user (sets status to Deleted)
    async fn soft_delete(&self, id: &UserId) -> Result<(), UpdateUserError>;
}

/// Repository for team operations
#[async_trait]
pub trait TeamRepository: Send + Sync {
    /// Find a team by ID
    async fn find_by_id(&self, id: &TeamId) -> Result<Option<Team>, FindTeamError>;

    /// Create a new team
    async fn create(&self, team: &NewTeam) -> Result<Team, CreateTeamError>;

    /// Update an existing team
    async fn update(&self, id: &TeamId, update: &TeamUpdate) -> Result<Team, UpdateTeamError>;

    /// List teams with pagination
    async fn list(&self, pagination: Pagination) -> Result<Page<Team>, sqlx::Error>;

    /// Add a member to a team
    async fn add_member(
        &self,
        team_id: &TeamId,
        user_id: &UserId,
        role: TeamRole,
    ) -> Result<TeamMembership, TeamMembershipError>;

    /// Remove a member from a team
    async fn remove_member(
        &self,
        team_id: &TeamId,
        user_id: &UserId,
    ) -> Result<(), TeamMembershipError>;

    /// List team members
    async fn list_members(
        &self,
        team_id: &TeamId,
        pagination: Pagination,
    ) -> Result<Page<TeamMembership>, FindTeamError>;

    /// Soft delete a team
    async fn soft_delete(&self, id: &TeamId) -> Result<(), UpdateTeamError>;
}

/// Repository for project operations
#[async_trait]
pub trait ProjectRepository: Send + Sync {
    /// Find a project by ID
    async fn find_by_id(&self, id: &ProjectId) -> Result<Option<Project>, FindProjectError>;

    /// Create a new project
    async fn create(&self, project: &NewProject) -> Result<Project, CreateProjectError>;

    /// Update an existing project
    async fn update(
        &self,
        id: &ProjectId,
        update: &ProjectUpdate,
    ) -> Result<Project, UpdateProjectError>;

    /// List projects with pagination
    async fn list(&self, pagination: Pagination) -> Result<Page<Project>, sqlx::Error>;

    /// Soft delete a project
    async fn soft_delete(&self, id: &ProjectId) -> Result<(), UpdateProjectError>;
}

/// Repository for task operations
#[async_trait]
pub trait TaskRepository: Send + Sync {
    /// Find a task by ID
    async fn find_by_id(&self, id: &TaskId) -> Result<Option<Task>, FindTaskError>;

    /// Create a new task
    async fn create(&self, task: &NewTask) -> Result<Task, CreateTaskError>;

    /// Update an existing task
    async fn update(&self, id: &TaskId, update: &TaskUpdate) -> Result<Task, UpdateTaskError>;

    /// List tasks by project with pagination
    async fn list_by_project(
        &self,
        project_id: &ProjectId,
        pagination: Pagination,
    ) -> Result<Page<Task>, sqlx::Error>;

    /// Soft delete a task
    async fn soft_delete(&self, id: &TaskId) -> Result<(), UpdateTaskError>;
}

/// Repository for annotation operations
#[async_trait]
pub trait AnnotationRepository: Send + Sync {
    /// Find an annotation by ID
    async fn find_by_id(
        &self,
        id: &AnnotationId,
    ) -> Result<Option<Annotation>, FindAnnotationError>;

    /// Create a new annotation
    async fn create(&self, annotation: &NewAnnotation)
        -> Result<Annotation, CreateAnnotationError>;

    /// Update an existing annotation (draft only)
    async fn update(
        &self,
        id: &AnnotationId,
        update: &AnnotationUpdate,
    ) -> Result<Annotation, UpdateAnnotationError>;

    /// List annotations by task with pagination
    async fn list_by_task(
        &self,
        task_id: &TaskId,
        pagination: Pagination,
    ) -> Result<Page<Annotation>, sqlx::Error>;

    /// Submit an annotation (changes status from Draft to Submitted)
    async fn submit(&self, id: &AnnotationId) -> Result<Annotation, UpdateAnnotationError>;
}

/// Repository for workflow operations
#[async_trait]
pub trait WorkflowRepository: Send + Sync {
    /// Find a workflow by ID
    async fn find_by_id(&self, id: &WorkflowId) -> Result<Option<Workflow>, FindWorkflowError>;

    /// List workflows with pagination
    async fn list(&self, pagination: Pagination) -> Result<Page<Workflow>, sqlx::Error>;
}
