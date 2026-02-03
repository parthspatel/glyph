//! PostgreSQL implementation of DataSourceRepository

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use glyph_domain::{
    CreateDataSource, DataSource, DataSourceFilter, DataSourceId, DataSourceType, ProjectId,
    UpdateDataSource, ValidationMode,
};

use super::errors::*;

// =============================================================================
// Repository Trait
// =============================================================================

/// Repository for data source operations
#[async_trait]
pub trait DataSourceRepository: Send + Sync {
    /// Create a new data source
    async fn create(
        &self,
        project_id: &ProjectId,
        input: &CreateDataSource,
    ) -> Result<DataSource, CreateDataSourceError>;

    /// Find a data source by ID
    async fn find_by_id(
        &self,
        id: &DataSourceId,
    ) -> Result<Option<DataSource>, FindDataSourceError>;

    /// List data sources with filtering
    async fn list(&self, filter: &DataSourceFilter)
        -> Result<Vec<DataSource>, FindDataSourceError>;

    /// Update a data source
    async fn update(
        &self,
        id: &DataSourceId,
        update: &UpdateDataSource,
    ) -> Result<DataSource, UpdateDataSourceError>;

    /// Delete a data source
    async fn delete(&self, id: &DataSourceId) -> Result<(), DeleteDataSourceError>;

    /// Update sync statistics
    async fn update_sync_stats(
        &self,
        id: &DataSourceId,
        item_count: i32,
        error_count: i32,
    ) -> Result<(), UpdateDataSourceError>;
}

// =============================================================================
// Row types for database mapping
// =============================================================================

#[derive(FromRow)]
struct DataSourceRow {
    data_source_id: Uuid,
    project_id: Uuid,
    name: String,
    source_type: String,
    config: serde_json::Value,
    validation_mode: String,
    last_sync_at: Option<DateTime<Utc>>,
    item_count: Option<i32>,
    error_count: Option<i32>,
    is_active: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

// =============================================================================
// PostgreSQL Implementation
// =============================================================================

/// PostgreSQL-backed data source repository
pub struct PgDataSourceRepository {
    pool: PgPool,
}

impl PgDataSourceRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    fn row_to_data_source(&self, row: DataSourceRow) -> DataSource {
        DataSource {
            data_source_id: DataSourceId::from_uuid(row.data_source_id),
            project_id: ProjectId::from_uuid(row.project_id),
            name: row.name,
            source_type: parse_source_type(&row.source_type).unwrap_or(DataSourceType::FileUpload),
            config: serde_json::from_value(row.config).unwrap_or_default(),
            validation_mode: parse_validation_mode(&row.validation_mode)
                .unwrap_or(ValidationMode::Strict),
            last_sync_at: row.last_sync_at,
            item_count: row.item_count.unwrap_or(0),
            error_count: row.error_count.unwrap_or(0),
            is_active: row.is_active,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[async_trait]
impl DataSourceRepository for PgDataSourceRepository {
    async fn create(
        &self,
        project_id: &ProjectId,
        input: &CreateDataSource,
    ) -> Result<DataSource, CreateDataSourceError> {
        let id = DataSourceId::new();
        let source_type = format_source_type(input.source_type);
        let config = serde_json::to_value(&input.config).unwrap_or_default();
        let validation_mode =
            format_validation_mode(input.validation_mode.unwrap_or(ValidationMode::Strict));

        let row: DataSourceRow = sqlx::query_as(
            r#"
            INSERT INTO data_sources (
                data_source_id, project_id, name, source_type, config,
                validation_mode, is_active
            )
            VALUES ($1, $2, $3, $4::data_source_type, $5, $6::validation_mode, true)
            RETURNING
                data_source_id, project_id, name, source_type::text, config,
                validation_mode::text, last_sync_at, item_count, error_count,
                is_active, created_at, updated_at
            "#,
        )
        .bind(id.as_uuid())
        .bind(project_id.as_uuid())
        .bind(&input.name)
        .bind(&source_type)
        .bind(&config)
        .bind(&validation_mode)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            if is_unique_violation(&e) {
                CreateDataSourceError::NameExists(input.name.clone())
            } else if is_foreign_key_violation(&e) {
                CreateDataSourceError::ProjectNotFound(project_id.clone())
            } else {
                CreateDataSourceError::Database(e)
            }
        })?;

        Ok(self.row_to_data_source(row))
    }

    async fn find_by_id(
        &self,
        id: &DataSourceId,
    ) -> Result<Option<DataSource>, FindDataSourceError> {
        let row: Option<DataSourceRow> = sqlx::query_as(
            r#"
            SELECT
                data_source_id, project_id, name, source_type::text, config,
                validation_mode::text, last_sync_at, item_count, error_count,
                is_active, created_at, updated_at
            FROM data_sources
            WHERE data_source_id = $1
            "#,
        )
        .bind(id.as_uuid())
        .fetch_optional(&self.pool)
        .await
        .map_err(FindDataSourceError::Database)?;

        Ok(row.map(|r| self.row_to_data_source(r)))
    }

    async fn list(
        &self,
        filter: &DataSourceFilter,
    ) -> Result<Vec<DataSource>, FindDataSourceError> {
        let rows: Vec<DataSourceRow> = sqlx::query_as(
            r#"
            SELECT
                data_source_id, project_id, name, source_type::text, config,
                validation_mode::text, last_sync_at, item_count, error_count,
                is_active, created_at, updated_at
            FROM data_sources
            WHERE ($1::uuid IS NULL OR project_id = $1)
              AND ($2::text IS NULL OR source_type::text = $2)
              AND ($3::bool IS NULL OR is_active = $3)
            ORDER BY created_at DESC
            "#,
        )
        .bind(filter.project_id.as_ref().map(|p| *p.as_uuid()))
        .bind(filter.source_type.map(format_source_type))
        .bind(filter.is_active)
        .fetch_all(&self.pool)
        .await
        .map_err(FindDataSourceError::Database)?;

        Ok(rows
            .into_iter()
            .map(|r| self.row_to_data_source(r))
            .collect())
    }

    async fn update(
        &self,
        id: &DataSourceId,
        update: &UpdateDataSource,
    ) -> Result<DataSource, UpdateDataSourceError> {
        let config = update
            .config
            .as_ref()
            .map(|c| serde_json::to_value(c).unwrap_or_default());
        let validation_mode = update.validation_mode.map(format_validation_mode);

        let row: Option<DataSourceRow> = sqlx::query_as(
            r#"
            UPDATE data_sources
            SET
                name = COALESCE($2, name),
                config = COALESCE($3, config),
                validation_mode = COALESCE($4::validation_mode, validation_mode),
                is_active = COALESCE($5, is_active),
                updated_at = NOW()
            WHERE data_source_id = $1
            RETURNING
                data_source_id, project_id, name, source_type::text, config,
                validation_mode::text, last_sync_at, item_count, error_count,
                is_active, created_at, updated_at
            "#,
        )
        .bind(id.as_uuid())
        .bind(&update.name)
        .bind(&config)
        .bind(&validation_mode)
        .bind(update.is_active)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            if is_unique_violation(&e) {
                UpdateDataSourceError::NameExists(
                    update.name.clone().unwrap_or_else(|| "unknown".to_string()),
                )
            } else {
                UpdateDataSourceError::Database(e)
            }
        })?;

        let row = row.ok_or_else(|| UpdateDataSourceError::NotFound(id.clone()))?;

        Ok(self.row_to_data_source(row))
    }

    async fn delete(&self, id: &DataSourceId) -> Result<(), DeleteDataSourceError> {
        let result = sqlx::query(r#"DELETE FROM data_sources WHERE data_source_id = $1"#)
            .bind(id.as_uuid())
            .execute(&self.pool)
            .await
            .map_err(DeleteDataSourceError::Database)?;

        if result.rows_affected() == 0 {
            return Err(DeleteDataSourceError::NotFound(id.clone()));
        }

        Ok(())
    }

    async fn update_sync_stats(
        &self,
        id: &DataSourceId,
        item_count: i32,
        error_count: i32,
    ) -> Result<(), UpdateDataSourceError> {
        let result = sqlx::query(
            r#"
            UPDATE data_sources
            SET
                item_count = $2,
                error_count = $3,
                last_sync_at = NOW(),
                updated_at = NOW()
            WHERE data_source_id = $1
            "#,
        )
        .bind(id.as_uuid())
        .bind(item_count)
        .bind(error_count)
        .execute(&self.pool)
        .await
        .map_err(UpdateDataSourceError::Database)?;

        if result.rows_affected() == 0 {
            return Err(UpdateDataSourceError::NotFound(id.clone()));
        }

        Ok(())
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn is_unique_violation(e: &sqlx::Error) -> bool {
    if let sqlx::Error::Database(db_err) = e {
        return db_err.constraint().is_some();
    }
    false
}

fn is_foreign_key_violation(e: &sqlx::Error) -> bool {
    if let sqlx::Error::Database(db_err) = e {
        if let Some(code) = db_err.code() {
            return code == "23503"; // PostgreSQL foreign key violation
        }
    }
    false
}

fn format_source_type(source_type: DataSourceType) -> String {
    source_type.as_str().to_string()
}

fn parse_source_type(s: &str) -> Option<DataSourceType> {
    DataSourceType::from_str(s)
}

fn format_validation_mode(mode: ValidationMode) -> String {
    mode.as_str().to_string()
}

fn parse_validation_mode(s: &str) -> Option<ValidationMode> {
    ValidationMode::from_str(s)
}
