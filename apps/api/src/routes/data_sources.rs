//! Data Source CRUD endpoints
//!
//! Nested under /projects/{project_id}/data-sources

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    routing::{get, post, put},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;

use glyph_db::{DataSourceRepository, PgDataSourceRepository};
use glyph_domain::{
    CreateDataSource, DataSource, DataSourceConfig, DataSourceFilter, DataSourceId, DataSourceType,
    ProjectId, UpdateDataSource, ValidationMode,
};

use crate::error::ApiError;
use crate::extractors::CurrentUser;

/// Data source list query parameters
#[derive(Debug, Deserialize)]
pub struct ListDataSourcesQuery {
    pub source_type: Option<String>,
    pub is_active: Option<bool>,
}

/// Data source list response
#[derive(Debug, Serialize, ToSchema)]
pub struct DataSourceListResponse {
    pub items: Vec<DataSourceResponse>,
    pub total: i64,
}

/// Data source response
#[derive(Debug, Serialize, ToSchema)]
pub struct DataSourceResponse {
    pub data_source_id: String,
    pub project_id: String,
    pub name: String,
    pub source_type: String,
    pub config: serde_json::Value,
    pub validation_mode: String,
    pub last_sync_at: Option<String>,
    pub item_count: i32,
    pub error_count: i32,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DataSource> for DataSourceResponse {
    fn from(ds: DataSource) -> Self {
        Self {
            data_source_id: ds.data_source_id.to_string(),
            project_id: ds.project_id.to_string(),
            name: ds.name,
            source_type: ds.source_type.as_str().to_string(),
            config: serde_json::to_value(&ds.config).unwrap_or_default(),
            validation_mode: ds.validation_mode.as_str().to_string(),
            last_sync_at: ds.last_sync_at.map(|t| t.to_rfc3339()),
            item_count: ds.item_count,
            error_count: ds.error_count,
            is_active: ds.is_active,
            created_at: ds.created_at.to_rfc3339(),
            updated_at: ds.updated_at.to_rfc3339(),
        }
    }
}

/// Request to create a data source
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateDataSourceRequest {
    pub name: String,
    pub source_type: String,
    pub config: serde_json::Value,
    pub validation_mode: Option<String>,
}

/// Request to update a data source
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateDataSourceRequest {
    pub name: Option<String>,
    pub config: Option<serde_json::Value>,
    pub validation_mode: Option<String>,
    pub is_active: Option<bool>,
}

/// Request to update credentials
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateCredentialsRequest {
    pub credentials: serde_json::Value,
}

/// Connection test response
#[derive(Debug, Serialize, ToSchema)]
pub struct TestConnectionResponse {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<i64>,
    pub sample_files: Option<Vec<String>>,
}

/// File list response
#[derive(Debug, Serialize, ToSchema)]
pub struct FileListResponse {
    pub files: Vec<FileInfoResponse>,
    pub total: i64,
    pub has_more: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct FileInfoResponse {
    pub path: String,
    pub size_bytes: u64,
    pub modified_at: Option<String>,
    pub content_type: Option<String>,
}

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_data_sources).post(create_data_source))
        .route(
            "/{data_source_id}",
            get(get_data_source)
                .put(update_data_source)
                .delete(delete_data_source),
        )
        .route("/{data_source_id}/test", post(test_connection))
        .route("/{data_source_id}/files", get(list_files))
        .route("/{data_source_id}/credentials", put(update_credentials))
        .route("/{data_source_id}/sync", post(trigger_sync))
}

/// List data sources for a project
#[utoipa::path(
    get,
    path = "/api/v1/projects/{project_id}/data-sources",
    params(
        ("project_id" = String, Path, description = "Project ID"),
        ("source_type" = Option<String>, Query, description = "Filter by type"),
        ("is_active" = Option<bool>, Query, description = "Filter active/inactive"),
    ),
    responses(
        (status = 200, description = "Data source list", body = DataSourceListResponse),
        (status = 404, description = "Project not found"),
    ),
    tag = "data-sources"
)]
async fn list_data_sources(
    Path(project_id): Path<String>,
    Query(params): Query<ListDataSourcesQuery>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
) -> Result<Json<DataSourceListResponse>, ApiError> {
    let project_id_parsed: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    let filter = DataSourceFilter {
        project_id: Some(project_id_parsed),
        source_type: params
            .source_type
            .and_then(|s| DataSourceType::from_str(&s)),
        is_active: params.is_active,
    };

    let repo = PgDataSourceRepository::new(pool);
    let items = repo.list(&filter).await.map_err(|e| {
        tracing::error!("Failed to list data sources: {:?}", e);
        ApiError::Internal(anyhow::anyhow!("{}", e))
    })?;

    let total = items.len() as i64;

    Ok(Json(DataSourceListResponse {
        items: items.into_iter().map(DataSourceResponse::from).collect(),
        total,
    }))
}

/// Get a data source by ID
#[utoipa::path(
    get,
    path = "/api/v1/projects/{project_id}/data-sources/{data_source_id}",
    params(
        ("project_id" = String, Path, description = "Project ID"),
        ("data_source_id" = String, Path, description = "Data Source ID"),
    ),
    responses(
        (status = 200, description = "Data source details", body = DataSourceResponse),
        (status = 404, description = "Data source not found"),
    ),
    tag = "data-sources"
)]
async fn get_data_source(
    Path((project_id, data_source_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
) -> Result<Json<DataSourceResponse>, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    let repo = PgDataSourceRepository::new(pool);
    let data_source = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find data source {}: {:?}", data_source_id, e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("data_source", &data_source_id))?;

    Ok(Json(DataSourceResponse::from(data_source)))
}

/// Create a new data source
#[utoipa::path(
    post,
    path = "/api/v1/projects/{project_id}/data-sources",
    params(
        ("project_id" = String, Path, description = "Project ID"),
    ),
    request_body = CreateDataSourceRequest,
    responses(
        (status = 201, description = "Data source created", body = DataSourceResponse),
        (status = 400, description = "Invalid request"),
        (status = 404, description = "Project not found"),
    ),
    tag = "data-sources"
)]
async fn create_data_source(
    Path(project_id): Path<String>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
    Json(req): Json<CreateDataSourceRequest>,
) -> Result<(StatusCode, Json<DataSourceResponse>), ApiError> {
    let project_id_parsed: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    // Validate name
    if req.name.trim().is_empty() {
        return Err(ApiError::bad_request(
            "validation.name_required",
            "Data source name is required",
        ));
    }

    // Validate and parse source type
    let source_type = DataSourceType::from_str(&req.source_type).ok_or_else(|| {
        ApiError::bad_request(
            "validation.invalid_source_type",
            format!("Invalid source type: {}", req.source_type),
        )
    })?;

    // Parse config based on source type
    let config = parse_config(source_type, &req.config)?;

    // Parse validation mode
    let validation_mode = req
        .validation_mode
        .and_then(|s| ValidationMode::from_str(&s));

    let create = CreateDataSource {
        name: req.name,
        source_type,
        config,
        validation_mode,
    };

    let repo = PgDataSourceRepository::new(pool);
    let data_source = repo
        .create(&project_id_parsed, &create)
        .await
        .map_err(|e| match e {
            glyph_db::CreateDataSourceError::NameExists(name) => ApiError::bad_request(
                "validation.name_exists",
                format!("Data source name already exists: {}", name),
            ),
            glyph_db::CreateDataSourceError::ProjectNotFound(_) => {
                ApiError::not_found("project", &project_id)
            }
            glyph_db::CreateDataSourceError::Database(e) => {
                tracing::error!("Failed to create data source: {:?}", e);
                ApiError::Internal(anyhow::anyhow!("{}", e))
            }
        })?;

    Ok((
        StatusCode::CREATED,
        Json(DataSourceResponse::from(data_source)),
    ))
}

/// Update a data source
#[utoipa::path(
    put,
    path = "/api/v1/projects/{project_id}/data-sources/{data_source_id}",
    params(
        ("project_id" = String, Path, description = "Project ID"),
        ("data_source_id" = String, Path, description = "Data Source ID"),
    ),
    request_body = UpdateDataSourceRequest,
    responses(
        (status = 200, description = "Data source updated", body = DataSourceResponse),
        (status = 404, description = "Data source not found"),
    ),
    tag = "data-sources"
)]
async fn update_data_source(
    Path((project_id, data_source_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
    Json(req): Json<UpdateDataSourceRequest>,
) -> Result<Json<DataSourceResponse>, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Parse config if provided - need to get current source type first
    let config = if let Some(config_value) = req.config {
        // Get current data source to know the type
        let repo = PgDataSourceRepository::new(pool.clone());
        let current = repo
            .find_by_id(&id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to find data source: {:?}", e);
                ApiError::Internal(anyhow::anyhow!("{}", e))
            })?
            .ok_or_else(|| ApiError::not_found("data_source", &data_source_id))?;

        Some(parse_config(current.source_type, &config_value)?)
    } else {
        None
    };

    let validation_mode = req
        .validation_mode
        .and_then(|s| ValidationMode::from_str(&s));

    let update = UpdateDataSource {
        name: req.name,
        config,
        validation_mode,
        is_active: req.is_active,
    };

    let repo = PgDataSourceRepository::new(pool);
    let data_source = repo.update(&id, &update).await.map_err(|e| match e {
        glyph_db::UpdateDataSourceError::NotFound(_) => {
            ApiError::not_found("data_source", &data_source_id)
        }
        glyph_db::UpdateDataSourceError::NameExists(name) => ApiError::bad_request(
            "validation.name_exists",
            format!("Data source name already exists: {}", name),
        ),
        glyph_db::UpdateDataSourceError::Database(e) => {
            tracing::error!("Failed to update data source: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        }
    })?;

    Ok(Json(DataSourceResponse::from(data_source)))
}

/// Delete a data source
#[utoipa::path(
    delete,
    path = "/api/v1/projects/{project_id}/data-sources/{data_source_id}",
    params(
        ("project_id" = String, Path, description = "Project ID"),
        ("data_source_id" = String, Path, description = "Data Source ID"),
    ),
    responses(
        (status = 204, description = "Data source deleted"),
        (status = 404, description = "Data source not found"),
    ),
    tag = "data-sources"
)]
async fn delete_data_source(
    Path((project_id, data_source_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
) -> Result<StatusCode, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    let repo = PgDataSourceRepository::new(pool);
    repo.delete(&id).await.map_err(|e| match e {
        glyph_db::DeleteDataSourceError::NotFound(_) => {
            ApiError::not_found("data_source", &data_source_id)
        }
        glyph_db::DeleteDataSourceError::Database(e) => {
            tracing::error!("Failed to delete data source: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        }
    })?;

    Ok(StatusCode::NO_CONTENT)
}

/// Test connection to a data source
#[utoipa::path(
    post,
    path = "/api/v1/projects/{project_id}/data-sources/{data_source_id}/test",
    params(
        ("project_id" = String, Path, description = "Project ID"),
        ("data_source_id" = String, Path, description = "Data Source ID"),
    ),
    responses(
        (status = 200, description = "Connection test result", body = TestConnectionResponse),
        (status = 404, description = "Data source not found"),
    ),
    tag = "data-sources"
)]
async fn test_connection(
    Path((project_id, data_source_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
) -> Result<Json<TestConnectionResponse>, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Verify data source exists
    let repo = PgDataSourceRepository::new(pool);
    let data_source = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find data source: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("data_source", &data_source_id))?;

    // Test based on source type
    let (success, message) = match data_source.source_type {
        DataSourceType::FileUpload => (true, "File upload source is ready".to_string()),
        DataSourceType::S3 => (false, "S3 connection test not implemented yet".to_string()),
        DataSourceType::Gcs => (false, "GCS connection test not implemented yet".to_string()),
        DataSourceType::AzureBlob => (
            false,
            "Azure Blob connection test not implemented yet".to_string(),
        ),
        DataSourceType::Api => (false, "API connection test not implemented yet".to_string()),
    };

    Ok(Json(TestConnectionResponse {
        success,
        message,
        latency_ms: None,
        sample_files: None,
    }))
}

/// List files in a data source
#[utoipa::path(
    get,
    path = "/api/v1/projects/{project_id}/data-sources/{data_source_id}/files",
    params(
        ("project_id" = String, Path, description = "Project ID"),
        ("data_source_id" = String, Path, description = "Data Source ID"),
    ),
    responses(
        (status = 200, description = "File list", body = FileListResponse),
        (status = 404, description = "Data source not found"),
    ),
    tag = "data-sources"
)]
async fn list_files(
    Path((project_id, data_source_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
) -> Result<Json<FileListResponse>, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Verify data source exists
    let repo = PgDataSourceRepository::new(pool);
    let _data_source = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find data source: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("data_source", &data_source_id))?;

    // Placeholder - will use StorageService to list files
    Ok(Json(FileListResponse {
        files: vec![],
        total: 0,
        has_more: false,
    }))
}

/// Update credentials for a data source
#[utoipa::path(
    put,
    path = "/api/v1/projects/{project_id}/data-sources/{data_source_id}/credentials",
    params(
        ("project_id" = String, Path, description = "Project ID"),
        ("data_source_id" = String, Path, description = "Data Source ID"),
    ),
    request_body = UpdateCredentialsRequest,
    responses(
        (status = 204, description = "Credentials updated"),
        (status = 404, description = "Data source not found"),
    ),
    tag = "data-sources"
)]
async fn update_credentials(
    Path((project_id, data_source_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
    Json(_req): Json<UpdateCredentialsRequest>,
) -> Result<StatusCode, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Verify data source exists
    let repo = PgDataSourceRepository::new(pool);
    let _data_source = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find data source: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("data_source", &data_source_id))?;

    // Placeholder - will encrypt and store credentials
    Ok(StatusCode::NO_CONTENT)
}

/// Trigger a sync for a data source
#[utoipa::path(
    post,
    path = "/api/v1/projects/{project_id}/data-sources/{data_source_id}/sync",
    params(
        ("project_id" = String, Path, description = "Project ID"),
        ("data_source_id" = String, Path, description = "Data Source ID"),
    ),
    responses(
        (status = 202, description = "Sync triggered"),
        (status = 404, description = "Data source not found"),
        (status = 501, description = "Not implemented"),
    ),
    tag = "data-sources"
)]
async fn trigger_sync(
    Path((project_id, data_source_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
) -> Result<StatusCode, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Verify data source exists
    let repo = PgDataSourceRepository::new(pool);
    let _data_source = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find data source: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("data_source", &data_source_id))?;

    // Return 501 - sync will be implemented in Task Management phase
    Err(ApiError::bad_request(
        "not_implemented",
        "Sync functionality will be available in a future release",
    ))
}

// =============================================================================
// Helper functions
// =============================================================================

/// Parse config JSON into appropriate DataSourceConfig variant
fn parse_config(
    source_type: DataSourceType,
    config: &serde_json::Value,
) -> Result<DataSourceConfig, ApiError> {
    match source_type {
        DataSourceType::FileUpload => {
            let allowed_extensions = config
                .get("allowed_extensions")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_else(|| {
                    vec!["json".to_string(), "jsonl".to_string(), "csv".to_string()]
                });

            let max_file_size_mb = config
                .get("max_file_size_mb")
                .and_then(|v| v.as_i64())
                .unwrap_or(100) as i32;

            Ok(DataSourceConfig::FileUpload {
                allowed_extensions,
                max_file_size_mb,
            })
        }
        DataSourceType::S3 => {
            let bucket = config
                .get("bucket")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    ApiError::bad_request("validation.missing_field", "S3 bucket is required")
                })?
                .to_string();

            let region = config
                .get("region")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    ApiError::bad_request("validation.missing_field", "S3 region is required")
                })?
                .to_string();

            let prefix = config
                .get("prefix")
                .and_then(|v| v.as_str())
                .map(String::from);
            let use_iam_role = config
                .get("use_iam_role")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            Ok(DataSourceConfig::S3 {
                bucket,
                region,
                prefix,
                use_iam_role,
            })
        }
        DataSourceType::Gcs => {
            let bucket = config
                .get("bucket")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    ApiError::bad_request("validation.missing_field", "GCS bucket is required")
                })?
                .to_string();

            let prefix = config
                .get("prefix")
                .and_then(|v| v.as_str())
                .map(String::from);
            let use_workload_identity = config
                .get("use_workload_identity")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            Ok(DataSourceConfig::Gcs {
                bucket,
                prefix,
                use_workload_identity,
            })
        }
        DataSourceType::AzureBlob => {
            let container = config
                .get("container")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    ApiError::bad_request(
                        "validation.missing_field",
                        "Azure Blob container is required",
                    )
                })?
                .to_string();

            let account = config
                .get("account")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    ApiError::bad_request(
                        "validation.missing_field",
                        "Azure storage account is required",
                    )
                })?
                .to_string();

            let prefix = config
                .get("prefix")
                .and_then(|v| v.as_str())
                .map(String::from);
            let use_managed_identity = config
                .get("use_managed_identity")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            Ok(DataSourceConfig::AzureBlob {
                container,
                account,
                prefix,
                use_managed_identity,
            })
        }
        DataSourceType::Api => {
            let endpoint = config
                .get("endpoint")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    ApiError::bad_request("validation.missing_field", "API endpoint is required")
                })?
                .to_string();

            let auth_type = config
                .get("auth_type")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();

            let headers = config
                .get("headers")
                .and_then(|v| v.as_object())
                .map(|obj| {
                    obj.iter()
                        .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                        .collect()
                })
                .unwrap_or_default();

            let polling_interval_seconds = config
                .get("polling_interval_seconds")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32);

            Ok(DataSourceConfig::Api {
                endpoint,
                auth_type,
                headers,
                polling_interval_seconds,
            })
        }
    }
}
