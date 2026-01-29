//! Data Source CRUD endpoints
//!
//! Nested under /projects/{project_id}/data-sources

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use glyph_domain::{DataSourceId, DataSourceType, ProjectId};

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
    Query(_params): Query<ListDataSourcesQuery>,
    _current_user: CurrentUser,
) -> Result<Json<DataSourceListResponse>, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    // Placeholder
    Ok(Json(DataSourceListResponse {
        items: vec![],
        total: 0,
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
    _current_user: CurrentUser,
) -> Result<Json<DataSourceResponse>, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let _id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Placeholder
    Err(ApiError::not_found("data_source", &data_source_id))
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

    // Validate source type
    let _source_type = DataSourceType::from_str(&req.source_type).ok_or_else(|| {
        ApiError::bad_request(
            "validation.invalid_source_type",
            format!("Invalid source type: {}", req.source_type),
        )
    })?;

    // Placeholder response
    let response = DataSourceResponse {
        data_source_id: DataSourceId::new().to_string(),
        project_id: project_id_parsed.to_string(),
        name: req.name,
        source_type: req.source_type,
        config: req.config,
        validation_mode: req.validation_mode.unwrap_or_else(|| "strict".to_string()),
        last_sync_at: None,
        item_count: 0,
        error_count: 0,
        is_active: true,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    Ok((StatusCode::CREATED, Json(response)))
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
    _current_user: CurrentUser,
    Json(_req): Json<UpdateDataSourceRequest>,
) -> Result<Json<DataSourceResponse>, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let _id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Placeholder
    Err(ApiError::not_found("data_source", &data_source_id))
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
    _current_user: CurrentUser,
) -> Result<StatusCode, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let _id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Placeholder
    Err(ApiError::not_found("data_source", &data_source_id))
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
    _current_user: CurrentUser,
) -> Result<Json<TestConnectionResponse>, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let _id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Placeholder - will use StorageService to test connection
    Ok(Json(TestConnectionResponse {
        success: true,
        message: "Connection test not implemented".to_string(),
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
    _current_user: CurrentUser,
) -> Result<Json<FileListResponse>, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let _id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

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
    _current_user: CurrentUser,
    Json(_req): Json<UpdateCredentialsRequest>,
) -> Result<StatusCode, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let _id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

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
    _current_user: CurrentUser,
) -> Result<StatusCode, ApiError> {
    let _project_id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;
    let _id: DataSourceId = data_source_id
        .parse()
        .map_err(|_| ApiError::not_found("data_source", &data_source_id))?;

    // Return 501 - sync will be implemented in Task Management phase
    Err(ApiError::bad_request(
        "not_implemented",
        "Sync functionality will be available in a future release",
    ))
}
