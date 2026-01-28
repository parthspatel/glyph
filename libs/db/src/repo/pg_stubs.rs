//! Stub PostgreSQL repository implementations
//!
//! These will be fully implemented in later phases.
//! They currently return `todo!()` to allow compilation.

use async_trait::async_trait;
use sqlx::PgPool;

use glyph_domain::{Annotation, Project, Task, Team, TeamMembership, TeamRole, Workflow};
use glyph_domain::{AnnotationId, ProjectId, TaskId, TeamId, WorkflowId};

use crate::pagination::{Page, Pagination};
use crate::repo::errors::*;
use crate::repo::traits::*;

// =============================================================================
// Team Repository Stub
// =============================================================================

pub struct PgTeamRepository {
    #[allow(dead_code)]
    pool: PgPool,
}

impl PgTeamRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TeamRepository for PgTeamRepository {
    async fn find_by_id(&self, _id: &TeamId) -> Result<Option<Team>, FindTeamError> {
        todo!("Implement in Phase 4")
    }

    async fn create(&self, _team: &NewTeam) -> Result<Team, CreateTeamError> {
        todo!("Implement in Phase 4")
    }

    async fn update(&self, _id: &TeamId, _update: &TeamUpdate) -> Result<Team, UpdateTeamError> {
        todo!("Implement in Phase 4")
    }

    async fn list(&self, _pagination: Pagination) -> Result<Page<Team>, sqlx::Error> {
        todo!("Implement in Phase 4")
    }

    async fn add_member(
        &self,
        _team_id: &TeamId,
        _user_id: &glyph_domain::UserId,
        _role: TeamRole,
    ) -> Result<TeamMembership, TeamMembershipError> {
        todo!("Implement in Phase 4")
    }

    async fn remove_member(
        &self,
        _team_id: &TeamId,
        _user_id: &glyph_domain::UserId,
    ) -> Result<(), TeamMembershipError> {
        todo!("Implement in Phase 4")
    }

    async fn list_members(
        &self,
        _team_id: &TeamId,
        _pagination: Pagination,
    ) -> Result<Page<TeamMembership>, FindTeamError> {
        todo!("Implement in Phase 4")
    }

    async fn soft_delete(&self, _id: &TeamId) -> Result<(), UpdateTeamError> {
        todo!("Implement in Phase 4")
    }
}

// =============================================================================
// Project Repository Stub
// =============================================================================

pub struct PgProjectRepository {
    #[allow(dead_code)]
    pool: PgPool,
}

impl PgProjectRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ProjectRepository for PgProjectRepository {
    async fn find_by_id(&self, _id: &ProjectId) -> Result<Option<Project>, FindProjectError> {
        todo!("Implement in Phase 5")
    }

    async fn create(&self, _project: &NewProject) -> Result<Project, CreateProjectError> {
        todo!("Implement in Phase 5")
    }

    async fn update(
        &self,
        _id: &ProjectId,
        _update: &ProjectUpdate,
    ) -> Result<Project, UpdateProjectError> {
        todo!("Implement in Phase 5")
    }

    async fn list(&self, _pagination: Pagination) -> Result<Page<Project>, sqlx::Error> {
        todo!("Implement in Phase 5")
    }

    async fn soft_delete(&self, _id: &ProjectId) -> Result<(), UpdateProjectError> {
        todo!("Implement in Phase 5")
    }
}

// =============================================================================
// Task Repository Stub
// =============================================================================

pub struct PgTaskRepository {
    #[allow(dead_code)]
    pool: PgPool,
}

impl PgTaskRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TaskRepository for PgTaskRepository {
    async fn find_by_id(&self, _id: &TaskId) -> Result<Option<Task>, FindTaskError> {
        todo!("Implement in Phase 7")
    }

    async fn create(&self, _task: &NewTask) -> Result<Task, CreateTaskError> {
        todo!("Implement in Phase 7")
    }

    async fn update(&self, _id: &TaskId, _update: &TaskUpdate) -> Result<Task, UpdateTaskError> {
        todo!("Implement in Phase 7")
    }

    async fn list_by_project(
        &self,
        _project_id: &ProjectId,
        _pagination: Pagination,
    ) -> Result<Page<Task>, sqlx::Error> {
        todo!("Implement in Phase 7")
    }

    async fn soft_delete(&self, _id: &TaskId) -> Result<(), UpdateTaskError> {
        todo!("Implement in Phase 7")
    }
}

// =============================================================================
// Annotation Repository Stub
// =============================================================================

pub struct PgAnnotationRepository {
    #[allow(dead_code)]
    pool: PgPool,
}

impl PgAnnotationRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AnnotationRepository for PgAnnotationRepository {
    async fn find_by_id(
        &self,
        _id: &AnnotationId,
    ) -> Result<Option<Annotation>, FindAnnotationError> {
        todo!("Implement in Phase 9")
    }

    async fn create(
        &self,
        _annotation: &NewAnnotation,
    ) -> Result<Annotation, CreateAnnotationError> {
        todo!("Implement in Phase 9")
    }

    async fn update(
        &self,
        _id: &AnnotationId,
        _update: &AnnotationUpdate,
    ) -> Result<Annotation, UpdateAnnotationError> {
        todo!("Implement in Phase 9")
    }

    async fn list_by_task(
        &self,
        _task_id: &TaskId,
        _pagination: Pagination,
    ) -> Result<Page<Annotation>, sqlx::Error> {
        todo!("Implement in Phase 9")
    }

    async fn submit(&self, _id: &AnnotationId) -> Result<Annotation, UpdateAnnotationError> {
        todo!("Implement in Phase 9")
    }
}

// =============================================================================
// Workflow Repository Stub
// =============================================================================

pub struct PgWorkflowRepository {
    #[allow(dead_code)]
    pool: PgPool,
}

impl PgWorkflowRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl WorkflowRepository for PgWorkflowRepository {
    async fn find_by_id(&self, _id: &WorkflowId) -> Result<Option<Workflow>, FindWorkflowError> {
        todo!("Implement in Phase 6")
    }

    async fn list(&self, _pagination: Pagination) -> Result<Page<Workflow>, sqlx::Error> {
        todo!("Implement in Phase 6")
    }
}
