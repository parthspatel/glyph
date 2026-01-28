//! Data export service

use async_trait::async_trait;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum ExportError {
    #[error("Project {0} not found")]
    ProjectNotFound(Uuid),

    #[error("Export format {0} not supported")]
    UnsupportedFormat(String),

    #[error("Export failed: {0}")]
    ExportFailed(String),

    #[error("Database error: {0}")]
    DatabaseError(String),
}

/// Supported export formats
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    Json,
    JsonLines,
    Csv,
    Parquet,
}

/// Options for export
#[derive(Debug, Clone)]
pub struct ExportOptions {
    pub format: ExportFormat,
    pub include_metadata: bool,
    pub include_quality_scores: bool,
    pub include_timestamps: bool,
    pub filter_status: Option<Vec<String>>,
}

impl Default for ExportOptions {
    fn default() -> Self {
        Self {
            format: ExportFormat::JsonLines,
            include_metadata: false,
            include_quality_scores: true,
            include_timestamps: true,
            filter_status: None,
        }
    }
}

/// Service for exporting annotation data
#[async_trait]
pub trait ExportService: Send + Sync {
    /// Export annotations for a project
    async fn export_project(
        &self,
        project_id: Uuid,
        options: &ExportOptions,
    ) -> Result<Vec<u8>, ExportError>;

    /// Export annotations for specific tasks
    async fn export_tasks(
        &self,
        task_ids: &[Uuid],
        options: &ExportOptions,
    ) -> Result<Vec<u8>, ExportError>;

    /// Get export progress for a running export job
    async fn get_export_progress(&self, job_id: Uuid) -> Result<f64, ExportError>;
}
