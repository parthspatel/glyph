//! Skill type and certification management endpoints

use axum::{extract::Path, http::StatusCode, Extension, Json};
use glyph_db::{
    CertifyUserSkill, NewSkillType, PgSkillRepository, SkillRepository, SkillTypeUpdate,
    UserSkillWithStatus,
};
use glyph_domain::{SkillType, UserId};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;

use crate::error::ApiError;
use crate::extractors::{CurrentUser, RequireAdmin};
use crate::services::PermissionService;

// =============================================================================
// Skill Type Types
// =============================================================================

/// Request to create a new skill type
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateSkillTypeRequest {
    /// Unique identifier (alphanumeric + underscore, e.g., "medical_translation")
    pub skill_id: String,
    /// Display name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Months until certification expires (None = never expires)
    pub expiration_months: Option<i32>,
    /// Days after expiration before hard-expired (default 0)
    #[serde(default)]
    pub grace_period_days: i32,
    /// Whether proficiency level is required
    #[serde(default)]
    pub requires_proficiency: bool,
    /// Allowed proficiency levels (required if requires_proficiency is true)
    pub proficiency_levels: Option<Vec<String>>,
}

/// Request to update a skill type
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateSkillTypeRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub expiration_months: Option<i32>,
    pub grace_period_days: Option<i32>,
    pub requires_proficiency: Option<bool>,
    pub proficiency_levels: Option<Vec<String>>,
}

/// Skill type response
#[derive(Debug, Serialize, ToSchema)]
pub struct SkillTypeResponse {
    pub skill_id: String,
    pub name: String,
    pub description: Option<String>,
    pub expiration_months: Option<i32>,
    pub grace_period_days: i32,
    pub requires_proficiency: bool,
    pub proficiency_levels: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<SkillType> for SkillTypeResponse {
    fn from(st: SkillType) -> Self {
        Self {
            skill_id: st.skill_id,
            name: st.name,
            description: st.description,
            expiration_months: st.expiration_months,
            grace_period_days: st.grace_period_days,
            requires_proficiency: st.requires_proficiency,
            proficiency_levels: st.proficiency_levels,
            created_at: st.created_at.to_rfc3339(),
            updated_at: st.updated_at.to_rfc3339(),
        }
    }
}

// =============================================================================
// User Skill Types
// =============================================================================

/// Request to certify a user skill
#[derive(Debug, Deserialize, ToSchema)]
pub struct CertifySkillRequest {
    pub proficiency_level: Option<String>,
    pub notes: Option<String>,
}

/// User skill response with computed status
#[derive(Debug, Serialize, ToSchema)]
pub struct UserSkillResponse {
    pub certification_id: String,
    pub skill_id: String,
    pub skill_name: String,
    pub proficiency_level: Option<String>,
    pub certified_by: Option<String>,
    pub certified_at: String,
    pub expires_at: Option<String>,
    pub status: String,
}

impl From<UserSkillWithStatus> for UserSkillResponse {
    fn from(s: UserSkillWithStatus) -> Self {
        Self {
            certification_id: s.certification_id.to_string(),
            skill_id: s.skill_id,
            skill_name: s.skill_name,
            proficiency_level: s.proficiency_level,
            certified_by: s.certified_by.map(|id| id.to_string()),
            certified_at: s.certified_at.to_rfc3339(),
            expires_at: s.expires_at.map(|t| t.to_rfc3339()),
            status: s.status,
        }
    }
}

// =============================================================================
// Skill Type Endpoints (Admin only)
// =============================================================================

/// Create a new skill type
#[utoipa::path(
    post,
    path = "/skills/types",
    tag = "skills",
    request_body = CreateSkillTypeRequest,
    responses(
        (status = 201, description = "Skill type created", body = SkillTypeResponse),
        (status = 400, description = "Invalid request"),
        (status = 409, description = "Skill type already exists"),
        (status = 403, description = "Admin only")
    )
)]
pub async fn create_skill_type(
    RequireAdmin(_admin): RequireAdmin,
    Extension(pool): Extension<PgPool>,
    Json(body): Json<CreateSkillTypeRequest>,
) -> Result<(StatusCode, Json<SkillTypeResponse>), ApiError> {
    // Validate skill_id format (alphanumeric + underscore)
    if !body
        .skill_id
        .chars()
        .all(|c| c.is_alphanumeric() || c == '_')
    {
        return Err(ApiError::bad_request(
            "skill.id.invalid",
            "Skill ID must be alphanumeric with underscores",
        ));
    }

    let repo = PgSkillRepository::new(pool);
    let skill_type = repo
        .create_skill_type(&NewSkillType {
            skill_id: body.skill_id,
            name: body.name,
            description: body.description,
            expiration_months: body.expiration_months,
            grace_period_days: body.grace_period_days,
            requires_proficiency: body.requires_proficiency,
            proficiency_levels: body.proficiency_levels,
        })
        .await
        .map_err(|e| match e {
            glyph_db::CreateSkillTypeError::AlreadyExists(id) => {
                ApiError::conflict(format!("Skill type already exists: {}", id))
            }
            glyph_db::CreateSkillTypeError::Database(e) => {
                ApiError::Internal(anyhow::anyhow!("{}", e))
            }
        })?;

    Ok((
        StatusCode::CREATED,
        Json(SkillTypeResponse::from(skill_type)),
    ))
}

/// List all skill types
#[utoipa::path(
    get,
    path = "/skills/types",
    tag = "skills",
    responses(
        (status = 200, description = "List of skill types", body = Vec<SkillTypeResponse>)
    )
)]
pub async fn list_skill_types(
    _user: CurrentUser,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<Vec<SkillTypeResponse>>, ApiError> {
    let repo = PgSkillRepository::new(pool);
    let types = repo
        .list_skill_types()
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;
    Ok(Json(
        types.into_iter().map(SkillTypeResponse::from).collect(),
    ))
}

/// Get a skill type by ID
#[utoipa::path(
    get,
    path = "/skills/types/{skill_id}",
    tag = "skills",
    params(("skill_id" = String, Path, description = "Skill type ID")),
    responses(
        (status = 200, description = "Skill type found", body = SkillTypeResponse),
        (status = 404, description = "Skill type not found")
    )
)]
pub async fn get_skill_type(
    _user: CurrentUser,
    Path(skill_id): Path<String>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<SkillTypeResponse>, ApiError> {
    let repo = PgSkillRepository::new(pool);
    let skill_type = repo
        .find_skill_type(&skill_id)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?
        .ok_or_else(|| ApiError::not_found("skill_type", skill_id))?;
    Ok(Json(SkillTypeResponse::from(skill_type)))
}

/// Update a skill type
#[utoipa::path(
    patch,
    path = "/skills/types/{skill_id}",
    tag = "skills",
    params(("skill_id" = String, Path, description = "Skill type ID")),
    request_body = UpdateSkillTypeRequest,
    responses(
        (status = 200, description = "Skill type updated", body = SkillTypeResponse),
        (status = 404, description = "Skill type not found"),
        (status = 403, description = "Admin only")
    )
)]
pub async fn update_skill_type(
    RequireAdmin(_admin): RequireAdmin,
    Path(skill_id): Path<String>,
    Extension(pool): Extension<PgPool>,
    Json(body): Json<UpdateSkillTypeRequest>,
) -> Result<Json<SkillTypeResponse>, ApiError> {
    let repo = PgSkillRepository::new(pool);
    let skill_type = repo
        .update_skill_type(
            &skill_id,
            &SkillTypeUpdate {
                name: body.name,
                description: body.description,
                expiration_months: body.expiration_months.map(Some),
                grace_period_days: body.grace_period_days,
                requires_proficiency: body.requires_proficiency,
                proficiency_levels: body.proficiency_levels.map(Some),
            },
        )
        .await
        .map_err(|e| match e {
            glyph_db::UpdateSkillTypeError::NotFound(id) => ApiError::not_found("skill_type", id),
            glyph_db::UpdateSkillTypeError::Database(e) => {
                ApiError::Internal(anyhow::anyhow!("{}", e))
            }
        })?;
    Ok(Json(SkillTypeResponse::from(skill_type)))
}

// =============================================================================
// User Skill Certification Endpoints
// =============================================================================

/// Certify a user skill
#[utoipa::path(
    post,
    path = "/users/{user_id}/skills/{skill_id}",
    tag = "skills",
    params(
        ("user_id" = String, Path, description = "Target user ID"),
        ("skill_id" = String, Path, description = "Skill type ID")
    ),
    request_body = CertifySkillRequest,
    responses(
        (status = 201, description = "Skill certified", body = UserSkillResponse),
        (status = 400, description = "Invalid proficiency level"),
        (status = 403, description = "Requires admin or skill:certifier role"),
        (status = 404, description = "User or skill type not found")
    )
)]
pub async fn certify_user_skill(
    current_user: CurrentUser,
    Path((user_id, skill_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    Json(body): Json<CertifySkillRequest>,
) -> Result<(StatusCode, Json<UserSkillResponse>), ApiError> {
    // Check certifier permission
    let permission_service = PermissionService::new(pool.clone());
    if !permission_service.can_certify_skills(&current_user) {
        return Err(ApiError::Forbidden {
            message: "Requires admin or skill certifier role".to_string(),
        });
    }

    let target_user_id: UserId = user_id.parse()?;

    let repo = PgSkillRepository::new(pool);
    let cert = repo
        .certify_skill(&CertifyUserSkill {
            user_id: target_user_id,
            skill_id,
            proficiency_level: body.proficiency_level,
            certified_by: current_user.user_id,
            notes: body.notes,
        })
        .await
        .map_err(|e| match e {
            glyph_db::CertifySkillError::SkillTypeNotFound(id) => {
                ApiError::not_found("skill_type", id)
            }
            glyph_db::CertifySkillError::UserNotFound(id) => {
                ApiError::not_found("user", id.to_string())
            }
            glyph_db::CertifySkillError::InvalidProficiency => ApiError::bad_request(
                "skill.proficiency.invalid",
                "Invalid proficiency level for this skill type",
            ),
            glyph_db::CertifySkillError::Database(e) => {
                ApiError::Internal(anyhow::anyhow!("{}", e))
            }
        })?;

    Ok((StatusCode::CREATED, Json(UserSkillResponse::from(cert))))
}

/// Revoke a user skill
#[utoipa::path(
    delete,
    path = "/users/{user_id}/skills/{skill_id}",
    tag = "skills",
    params(
        ("user_id" = String, Path, description = "Target user ID"),
        ("skill_id" = String, Path, description = "Skill type ID")
    ),
    responses(
        (status = 204, description = "Skill revoked"),
        (status = 403, description = "Requires admin or skill:certifier role"),
        (status = 404, description = "Certification not found")
    )
)]
pub async fn revoke_user_skill(
    current_user: CurrentUser,
    Path((user_id, skill_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
) -> Result<StatusCode, ApiError> {
    let permission_service = PermissionService::new(pool.clone());
    if !permission_service.can_certify_skills(&current_user) {
        return Err(ApiError::Forbidden {
            message: "Requires admin or skill certifier role".to_string(),
        });
    }

    let target_user_id: UserId = user_id.parse()?;
    let repo = PgSkillRepository::new(pool);
    repo.revoke_skill(&target_user_id, &skill_id)
        .await
        .map_err(|e| match e {
            glyph_db::RevokeSkillError::NotFound => {
                ApiError::not_found("user_skill", format!("{}:{}", user_id, skill_id))
            }
            glyph_db::RevokeSkillError::Database(e) => ApiError::Internal(anyhow::anyhow!("{}", e)),
        })?;

    Ok(StatusCode::NO_CONTENT)
}

/// List a user's skills
#[utoipa::path(
    get,
    path = "/users/{user_id}/skills",
    tag = "skills",
    params(("user_id" = String, Path, description = "User ID")),
    responses(
        (status = 200, description = "User skills list", body = Vec<UserSkillResponse>)
    )
)]
pub async fn list_user_skills(
    _user: CurrentUser,
    Path(user_id): Path<String>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<Vec<UserSkillResponse>>, ApiError> {
    let target_user_id: UserId = user_id.parse()?;
    let repo = PgSkillRepository::new(pool);
    let skills = repo
        .list_user_skills(&target_user_id)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;
    Ok(Json(
        skills.into_iter().map(UserSkillResponse::from).collect(),
    ))
}

// =============================================================================
// Routes
// =============================================================================

/// Skill type routes (/api/v1/skills/types)
pub fn skill_type_routes() -> axum::Router {
    use axum::routing::get;

    axum::Router::new()
        .route("/", get(list_skill_types).post(create_skill_type))
        .route("/{skill_id}", get(get_skill_type).patch(update_skill_type))
}

/// User skill routes (/api/v1/users/{user_id}/skills)
pub fn user_skill_routes() -> axum::Router {
    use axum::routing::get;

    axum::Router::new().route("/", get(list_user_skills)).route(
        "/{skill_id}",
        get(list_user_skills)
            .post(certify_user_skill)
            .delete(revoke_user_skill),
    )
}
