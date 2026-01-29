//! User management endpoints

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Extension, Json,
};
use glyph_db::{NewUser, Pagination, PgUserRepository, UserRepository, UserUpdate};
use glyph_domain::{ContactInfo, GlobalRole, QualityProfile, User, UserId};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;

use crate::error::ApiError;
use crate::extractors::{CurrentUser, RequireAdmin};

/// User list response with pagination
#[derive(Debug, Serialize, ToSchema)]
pub struct UserListResponse {
    pub items: Vec<UserSummary>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Summary view of a user for list responses
#[derive(Debug, Serialize, ToSchema)]
pub struct UserSummary {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub status: String,
    pub global_role: String,
    pub department: Option<String>,
}

impl From<User> for UserSummary {
    fn from(u: User) -> Self {
        Self {
            user_id: u.user_id.to_string(),
            email: u.email,
            display_name: u.display_name,
            status: format!("{:?}", u.status).to_lowercase(),
            global_role: format!("{:?}", u.global_role).to_lowercase(),
            department: u.department,
        }
    }
}

/// Detailed user response
#[derive(Debug, Serialize, ToSchema)]
pub struct UserDetailResponse {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub status: String,
    pub timezone: Option<String>,
    pub department: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub contact_info: ContactInfo,
    pub global_role: String,
    pub quality_profile: QualityProfileResponse,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct QualityProfileResponse {
    pub overall_score: Option<f64>,
    pub accuracy_score: Option<f64>,
    pub consistency_score: Option<f64>,
    pub speed_percentile: Option<f64>,
    pub total_annotations: i64,
    pub approved_annotations: i64,
    pub rejected_annotations: i64,
}

impl From<QualityProfile> for QualityProfileResponse {
    fn from(q: QualityProfile) -> Self {
        Self {
            overall_score: q.overall_score,
            accuracy_score: q.accuracy_score,
            consistency_score: q.consistency_score,
            speed_percentile: q.speed_percentile,
            total_annotations: q.total_annotations,
            approved_annotations: q.approved_annotations,
            rejected_annotations: q.rejected_annotations,
        }
    }
}

impl From<User> for UserDetailResponse {
    fn from(u: User) -> Self {
        Self {
            user_id: u.user_id.to_string(),
            email: u.email,
            display_name: u.display_name,
            status: format!("{:?}", u.status).to_lowercase(),
            timezone: u.timezone,
            department: u.department,
            bio: u.bio,
            avatar_url: u.avatar_url,
            contact_info: u.contact_info,
            global_role: format!("{:?}", u.global_role).to_lowercase(),
            quality_profile: QualityProfileResponse::from(u.quality_profile),
            created_at: u.created_at.to_rfc3339(),
            updated_at: u.updated_at.to_rfc3339(),
        }
    }
}

/// Create user request
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateUserRequest {
    pub email: String,
    pub display_name: String,
    #[serde(default)]
    pub timezone: Option<String>,
    #[serde(default)]
    pub department: Option<String>,
    #[serde(default)]
    pub global_role: Option<String>,
}

/// Update user request
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateUserRequest {
    pub display_name: Option<String>,
    pub timezone: Option<String>,
    pub department: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub contact_info: Option<ContactInfo>,
}

/// List all users with pagination
#[utoipa::path(
    get,
    path = "/users",
    tag = "users",
    params(
        ("limit" = Option<i64>, Query, description = "Max results per page (default 20, max 100)"),
        ("offset" = Option<i64>, Query, description = "Number of items to skip")
    ),
    responses(
        (status = 200, description = "List of users", body = UserListResponse),
        (status = 401, description = "Unauthorized")
    )
)]
pub async fn list_users(
    _user: CurrentUser,
    Query(pagination): Query<Pagination>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<UserListResponse>, ApiError> {
    let repo = PgUserRepository::new(pool);
    let page = repo
        .list(pagination)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;

    Ok(Json(UserListResponse {
        items: page.items.into_iter().map(UserSummary::from).collect(),
        total: page.total,
        limit: page.limit,
        offset: page.offset,
    }))
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
        (status = 200, description = "User found", body = UserDetailResponse),
        (status = 404, description = "User not found"),
        (status = 401, description = "Unauthorized")
    )
)]
pub async fn get_user(
    _user: CurrentUser,
    Path(user_id): Path<String>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<UserDetailResponse>, ApiError> {
    let id: UserId = user_id.parse()?;

    let repo = PgUserRepository::new(pool);
    let user = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find user {}: {:?}", user_id, e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("user", user_id.clone()))?;

    Ok(Json(UserDetailResponse::from(user)))
}

/// Create a new user (admin only)
#[utoipa::path(
    post,
    path = "/users",
    tag = "users",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "User created", body = UserDetailResponse),
        (status = 400, description = "Invalid request"),
        (status = 409, description = "Email already exists"),
        (status = 403, description = "Admin only")
    )
)]
pub async fn create_user(
    RequireAdmin(_admin): RequireAdmin,
    Extension(pool): Extension<PgPool>,
    Json(body): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<UserDetailResponse>), ApiError> {
    // Validate email format
    if !body.email.contains('@') {
        return Err(ApiError::bad_request(
            "user.email.invalid",
            "Invalid email format",
        ));
    }

    let new_user = NewUser {
        email: body.email,
        display_name: body.display_name,
        timezone: body.timezone,
        department: body.department,
        global_role: body.global_role.and_then(|r| parse_global_role(&r)),
        ..Default::default()
    };

    let repo = PgUserRepository::new(pool);
    let user = repo.create(&new_user).await.map_err(|e| match e {
        glyph_db::CreateUserError::EmailExists(email) => ApiError::conflict(
            "user.email.exists",
            format!("Email already exists: {}", email),
        ),
        glyph_db::CreateUserError::Database(e) => ApiError::Internal(anyhow::anyhow!("{}", e)),
    })?;

    Ok((StatusCode::CREATED, Json(UserDetailResponse::from(user))))
}

/// Update user profile
#[utoipa::path(
    patch,
    path = "/users/{user_id}",
    tag = "users",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    request_body = UpdateUserRequest,
    responses(
        (status = 200, description = "User updated", body = UserDetailResponse),
        (status = 404, description = "User not found"),
        (status = 403, description = "Can only update own profile unless admin")
    )
)]
pub async fn update_user(
    current_user: CurrentUser,
    Path(user_id): Path<String>,
    Extension(pool): Extension<PgPool>,
    Json(body): Json<UpdateUserRequest>,
) -> Result<Json<UserDetailResponse>, ApiError> {
    let id: UserId = user_id.parse()?;

    // Users can only update their own profile unless admin
    if current_user.user_id != id && !current_user.has_role("admin") {
        return Err(ApiError::Forbidden {
            permission: "user:update(self) or role:admin".to_string(),
        });
    }

    let update = UserUpdate {
        display_name: body.display_name,
        timezone: body.timezone,
        department: body.department,
        bio: body.bio,
        avatar_url: body.avatar_url,
        contact_info: body.contact_info,
        ..Default::default()
    };

    let repo = PgUserRepository::new(pool);
    let user = repo.update(&id, &update).await.map_err(|e| match e {
        glyph_db::UpdateUserError::NotFound(id) => ApiError::not_found("user", id.to_string()),
        glyph_db::UpdateUserError::EmailExists(email) => ApiError::conflict(
            "user.email.exists",
            format!("Email already exists: {}", email),
        ),
        glyph_db::UpdateUserError::Database(e) => ApiError::Internal(anyhow::anyhow!("{}", e)),
    })?;

    Ok(Json(UserDetailResponse::from(user)))
}

/// Delete user (soft delete, admin only)
#[utoipa::path(
    delete,
    path = "/users/{user_id}",
    tag = "users",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    responses(
        (status = 204, description = "User deleted"),
        (status = 404, description = "User not found"),
        (status = 403, description = "Admin only")
    )
)]
pub async fn delete_user(
    RequireAdmin(_admin): RequireAdmin,
    Path(user_id): Path<String>,
    Extension(pool): Extension<PgPool>,
) -> Result<StatusCode, ApiError> {
    let id: UserId = user_id.parse()?;

    let repo = PgUserRepository::new(pool);
    repo.soft_delete(&id).await.map_err(|e| match e {
        glyph_db::UpdateUserError::NotFound(id) => ApiError::not_found("user", id.to_string()),
        glyph_db::UpdateUserError::EmailExists(_) => {
            ApiError::Internal(anyhow::anyhow!("Unexpected error"))
        }
        glyph_db::UpdateUserError::Database(e) => ApiError::Internal(anyhow::anyhow!("{}", e)),
    })?;

    Ok(StatusCode::NO_CONTENT)
}

fn parse_global_role(s: &str) -> Option<GlobalRole> {
    match s.to_lowercase().as_str() {
        "admin" => Some(GlobalRole::Admin),
        "user" => Some(GlobalRole::User),
        _ => None,
    }
}

/// Build user routes
pub fn routes() -> axum::Router {
    use axum::routing::get;

    axum::Router::new()
        .route("/", get(list_users).post(create_user))
        .route(
            "/{user_id}",
            get(get_user).patch(update_user).delete(delete_user),
        )
}
