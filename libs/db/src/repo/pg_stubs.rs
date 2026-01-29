//! Stub PostgreSQL repository implementations
//!
//! These will be fully implemented in later phases.
//! They currently return `todo!()` to allow compilation.

use async_trait::async_trait;
use sqlx::PgPool;

use glyph_domain::{Annotation, Task, Workflow};
use glyph_domain::{AnnotationId, ProjectId, TaskId, WorkflowId};

use crate::pagination::{Page, Pagination};
use crate::repo::errors::*;
use crate::repo::traits::*;

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
