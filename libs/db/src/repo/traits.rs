//! Repository trait definitions
//!
//! These traits define the interface for data access operations.
//! Implementations are provided for PostgreSQL in separate modules.

use async_trait::async_trait;
use uuid::Uuid;

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
#[derive(Debug, Clone, Default)]
pub struct NewUser {
    pub email: String,
    pub display_name: String,
    pub auth0_id: Option<String>,
    pub timezone: Option<String>,
    pub department: Option<String>,
    pub global_role: Option<glyph_domain::GlobalRole>,
}

/// Input for updating a user
#[derive(Debug, Clone, Default)]
pub struct UserUpdate {
    pub display_name: Option<String>,
    pub status: Option<UserStatus>,
    pub timezone: Option<String>,
    pub department: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub contact_info: Option<glyph_domain::ContactInfo>,
    pub global_role: Option<glyph_domain::GlobalRole>,
}

/// Input for creating a new team
#[derive(Debug, Clone)]
pub struct NewTeam {
    pub name: String,
    pub description: Option<String>,
    pub parent_team_id: Option<TeamId>,
    pub capacity: Option<i32>,
    pub specializations: Vec<String>,
    pub initial_leader_id: Option<UserId>,
}

/// Input for updating a team
#[derive(Debug, Clone, Default)]
pub struct TeamUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<TeamStatus>,
    pub capacity: Option<i32>,
    pub specializations: Option<Vec<String>>,
}

/// Team node in hierarchy tree
#[derive(Debug, Clone)]
pub struct TeamTreeNode {
    pub team: Team,
    pub depth: i32,
    pub member_count: i64,
    pub sub_team_count: i64,
}

/// Team membership with user details
#[derive(Debug, Clone)]
pub struct TeamMembershipWithUser {
    pub team_id: TeamId,
    pub user_id: UserId,
    pub role: TeamRole,
    pub allocation_percentage: Option<i32>,
    pub joined_at: chrono::DateTime<chrono::Utc>,
    pub display_name: String,
    pub email: String,
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

    /// Find a user by Auth0 subject ID
    async fn find_by_auth0_id(&self, auth0_id: &str) -> Result<Option<User>, FindUserError>;

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

    /// List root teams (no parent) with pagination
    async fn list_root_teams(&self, pagination: Pagination) -> Result<Page<Team>, sqlx::Error>;

    /// Get direct sub-teams of a team
    async fn get_sub_teams(&self, team_id: &TeamId) -> Result<Vec<Team>, FindTeamError>;

    /// Get team hierarchy tree (recursive)
    async fn get_team_tree(&self, team_id: &TeamId) -> Result<Vec<TeamTreeNode>, FindTeamError>;

    /// Add a member to a team
    async fn add_member(
        &self,
        team_id: &TeamId,
        user_id: &UserId,
        role: TeamRole,
        allocation: Option<i32>,
    ) -> Result<TeamMembership, TeamMembershipError>;

    /// Remove a member from a team
    async fn remove_member(
        &self,
        team_id: &TeamId,
        user_id: &UserId,
    ) -> Result<(), TeamMembershipError>;

    /// Update a team member's role or allocation
    async fn update_member(
        &self,
        team_id: &TeamId,
        user_id: &UserId,
        role: Option<TeamRole>,
        allocation: Option<i32>,
    ) -> Result<TeamMembership, TeamMembershipError>;

    /// List team members with user details
    async fn list_members(
        &self,
        team_id: &TeamId,
        pagination: Pagination,
    ) -> Result<Page<TeamMembershipWithUser>, FindTeamError>;

    /// Get member count for a team
    async fn get_member_count(&self, team_id: &TeamId) -> Result<i64, sqlx::Error>;

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

    /// Set cooldown period for a task (prevents reassignment until cooldown expires)
    async fn set_cooldown(
        &self,
        id: &TaskId,
        until: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), UpdateTaskError>;
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

// =============================================================================
// Skill Repository Types and Trait
// =============================================================================

/// Input for creating a new skill type
#[derive(Debug, Clone)]
pub struct NewSkillType {
    pub skill_id: String,
    pub name: String,
    pub description: Option<String>,
    pub expiration_months: Option<i32>,
    pub grace_period_days: i32,
    pub requires_proficiency: bool,
    pub proficiency_levels: Option<Vec<String>>,
}

/// Input for updating a skill type
#[derive(Debug, Clone, Default)]
pub struct SkillTypeUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub expiration_months: Option<Option<i32>>,
    pub grace_period_days: Option<i32>,
    pub requires_proficiency: Option<bool>,
    pub proficiency_levels: Option<Option<Vec<String>>>,
}

/// Input for certifying a user skill
#[derive(Debug, Clone)]
pub struct CertifyUserSkill {
    pub user_id: UserId,
    pub skill_id: String,
    pub proficiency_level: Option<String>,
    pub certified_by: UserId,
    pub notes: Option<String>,
}

/// User skill with computed status from database view
#[derive(Debug, Clone)]
pub struct UserSkillWithStatus {
    pub certification_id: Uuid,
    pub user_id: UserId,
    pub skill_id: String,
    pub skill_name: String,
    pub proficiency_level: Option<String>,
    pub certified_by: Option<UserId>,
    pub certified_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub notes: Option<String>,
    pub grace_period_days: i32,
    pub status: String,
}

/// Repository for skill operations
#[async_trait]
pub trait SkillRepository: Send + Sync {
    /// Create a new skill type
    async fn create_skill_type(
        &self,
        skill_type: &NewSkillType,
    ) -> Result<glyph_domain::SkillType, CreateSkillTypeError>;

    /// Find a skill type by ID
    async fn find_skill_type(
        &self,
        skill_id: &str,
    ) -> Result<Option<glyph_domain::SkillType>, FindSkillTypeError>;

    /// List all skill types
    async fn list_skill_types(&self) -> Result<Vec<glyph_domain::SkillType>, sqlx::Error>;

    /// Update a skill type
    async fn update_skill_type(
        &self,
        skill_id: &str,
        update: &SkillTypeUpdate,
    ) -> Result<glyph_domain::SkillType, UpdateSkillTypeError>;

    /// Certify a user skill
    async fn certify_skill(
        &self,
        cert: &CertifyUserSkill,
    ) -> Result<UserSkillWithStatus, CertifySkillError>;

    /// Revoke a user skill
    async fn revoke_skill(&self, user_id: &UserId, skill_id: &str) -> Result<(), RevokeSkillError>;

    /// List a user's skills with computed status
    async fn list_user_skills(
        &self,
        user_id: &UserId,
    ) -> Result<Vec<UserSkillWithStatus>, sqlx::Error>;

    /// Get a specific user skill
    async fn get_user_skill(
        &self,
        user_id: &UserId,
        skill_id: &str,
    ) -> Result<Option<UserSkillWithStatus>, sqlx::Error>;
}

// =============================================================================
// Assignment Repository
// =============================================================================

/// Input for creating a new assignment
#[derive(Debug, Clone)]
pub struct NewAssignment {
    pub task_id: TaskId,
    pub project_id: ProjectId,
    pub step_id: String,
    pub user_id: UserId,
}

/// Input for rejecting an assignment
#[derive(Debug, Clone)]
pub struct RejectAssignment {
    pub assignment_id: AssignmentId,
    pub reason: serde_json::Value,
}

/// Repository for assignment operations
#[async_trait]
pub trait AssignmentRepository: Send + Sync {
    /// Find an assignment by ID
    async fn find_by_id(
        &self,
        id: &AssignmentId,
    ) -> Result<Option<glyph_domain::TaskAssignment>, FindAssignmentError>;

    /// Create a new assignment (with duplicate prevention)
    async fn create(
        &self,
        assignment: &NewAssignment,
    ) -> Result<glyph_domain::TaskAssignment, CreateAssignmentError>;

    /// Update assignment status
    async fn update_status(
        &self,
        id: &AssignmentId,
        status: glyph_domain::AssignmentStatus,
    ) -> Result<glyph_domain::TaskAssignment, UpdateAssignmentError>;

    /// List assignments by user with optional status filter
    async fn list_by_user(
        &self,
        user_id: &UserId,
        status: Option<glyph_domain::AssignmentStatus>,
    ) -> Result<Vec<glyph_domain::TaskAssignment>, sqlx::Error>;

    /// List all assignments for a task
    async fn list_by_task(
        &self,
        task_id: &TaskId,
    ) -> Result<Vec<glyph_domain::TaskAssignment>, sqlx::Error>;

    /// Reject an assignment with reason
    async fn reject(&self, reject: &RejectAssignment) -> Result<(), UpdateAssignmentError>;

    /// Check if user has worked on a task in specified steps (for cross-step exclusion)
    async fn has_user_worked_on_task(
        &self,
        user_id: &UserId,
        task_id: &TaskId,
        exclude_steps: &[String],
    ) -> Result<bool, sqlx::Error>;

    /// Count active assignments for a user (for load balancing)
    async fn count_active_by_user(&self, user_id: &UserId) -> Result<i64, sqlx::Error>;
}
