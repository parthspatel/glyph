//! User management endpoints

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use glyph_db::Pagination;
use glyph_domain::UserId;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::ApiError;

/// User list response
#[derive(Debug, Serialize, ToSchema)]
pub struct UserListResponse {
    pub items: Vec<UserResponse>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// User response
#[derive(Debug, Serialize, ToSchema)]
pub struct UserResponse {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub status: String,
}

/// Create user request
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateUserRequest {
    pub email: String,
    pub display_name: String,
}

/// List all users
#[utoipa::path(
    get,
    path = "/users",
    tag = "users",
    params(
        ("limit" = Option<i64>, Query, description = "Max results per page (default 20, max 100)"),
        ("offset" = Option<i64>, Query, description = "Number of items to skip")
    ),
    responses(
        (status = 200, description = "List of users"),
        (status = 501, description = "Not implemented")
    )
)]
pub async fn list_users(
    Query(_pagination): Query<Pagination>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Return 501 Not Implemented - will be implemented in Phase 4
    Err(ApiError::Internal(anyhow::anyhow!("Not implemented")))
}

/// Get user by ID
#[utoipa::path(
    get,
    path = "/users/{user_id}",
    tag = "users",
    params(
        ("user_id" = String, Path, description = "User ID (prefixed, e.g., user_01234...)")
    ),
    responses(
        (status = 200, description = "User found"),
        (status = 404, description = "User not found"),
        (status = 501, description = "Not implemented")
    )
)]
pub async fn get_user(Path(user_id): Path<String>) -> Result<Json<serde_json::Value>, ApiError> {
    // Validate ID format
    let _id: UserId = user_id.parse().map_err(|e: glyph_domain::IdParseError| {
        ApiError::bad_request("user.id.invalid", e.to_string())
    })?;

    // Return 501 Not Implemented - will be implemented in Phase 4
    Err(ApiError::Internal(anyhow::anyhow!("Not implemented")))
}

/// Create a new user
#[utoipa::path(
    post,
    path = "/users",
    tag = "users",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "User created"),
        (status = 400, description = "Invalid request"),
        (status = 409, description = "Email already exists"),
        (status = 501, description = "Not implemented")
    )
)]
pub async fn create_user(
    Json(_body): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), ApiError> {
    // Return 501 Not Implemented - will be implemented in Phase 4
    Err(ApiError::Internal(anyhow::anyhow!("Not implemented")))
}

/// Build user routes
pub fn routes() -> axum::Router {
    use axum::routing::{get, post};

    axum::Router::new()
        .route("/", get(list_users).post(create_user))
        .route("/{user_id}", get(get_user))
}
