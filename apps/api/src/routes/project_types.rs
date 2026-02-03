//! Project Type CRUD endpoints

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    routing::{delete, get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;

use glyph_db::{PgProjectTypeRepository, ProjectTypeRepository};
use glyph_domain::{
    CreateProjectType, DifficultyLevel, ProficiencyLevel, ProjectType, ProjectTypeFilter,
    ProjectTypeId, SkillRequirement, UpdateProjectType,
};

use crate::error::ApiError;
use crate::extractors::CurrentUser;
use crate::services::SchemaValidationService;

/// Project type list query parameters
#[derive(Debug, Deserialize)]
pub struct ListProjectTypesQuery {
    pub is_system: Option<bool>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Project type list response
#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectTypeListResponse {
    pub items: Vec<ProjectTypeResponse>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Project type response
#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectTypeResponse {
    pub project_type_id: String,
    pub name: String,
    pub description: Option<String>,
    pub input_schema: serde_json::Value,
    pub output_schema: serde_json::Value,
    pub estimated_duration_seconds: Option<i32>,
    pub difficulty_level: Option<String>,
    pub skill_requirements: Vec<SkillRequirementResponse>,
    pub is_system: bool,
    pub created_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub usage_count: i64,
}

impl From<ProjectType> for ProjectTypeResponse {
    fn from(pt: ProjectType) -> Self {
        Self {
            project_type_id: pt.project_type_id.to_string(),
            name: pt.name,
            description: pt.description,
            input_schema: pt.input_schema,
            output_schema: pt.output_schema,
            estimated_duration_seconds: pt.estimated_duration_seconds,
            difficulty_level: pt.difficulty_level.map(format_difficulty),
            skill_requirements: pt
                .skill_requirements
                .into_iter()
                .map(SkillRequirementResponse::from)
                .collect(),
            is_system: pt.is_system,
            created_by: pt.created_by.map(|u| u.to_string()),
            created_at: pt.created_at.to_rfc3339(),
            updated_at: pt.updated_at.to_rfc3339(),
            usage_count: 0, // TODO: compute from projects table
        }
    }
}

/// Skill requirement response
#[derive(Debug, Serialize, ToSchema)]
pub struct SkillRequirementResponse {
    pub skill_id: String,
    pub min_proficiency: String,
    pub is_required: bool,
    pub weight: f32,
}

impl From<SkillRequirement> for SkillRequirementResponse {
    fn from(sr: SkillRequirement) -> Self {
        Self {
            skill_id: sr.skill_id,
            min_proficiency: format_proficiency(sr.min_proficiency),
            is_required: sr.is_required,
            weight: sr.weight,
        }
    }
}

/// Request to create a new project type
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateProjectTypeRequest {
    pub name: String,
    pub description: Option<String>,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub estimated_duration_seconds: Option<i32>,
    pub difficulty_level: Option<String>,
    pub skill_requirements: Option<Vec<SkillRequirementRequest>>,
}

/// Request to update a project type
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateProjectTypeRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub estimated_duration_seconds: Option<i32>,
    pub difficulty_level: Option<String>,
}

/// Skill requirement in request
#[derive(Debug, Deserialize, ToSchema)]
pub struct SkillRequirementRequest {
    pub skill_id: String,
    pub min_proficiency: String,
    pub is_required: Option<bool>,
    pub weight: Option<f32>,
}

/// Request to validate schema
#[derive(Debug, Deserialize, ToSchema)]
pub struct ValidateSchemaRequest {
    pub schema: serde_json::Value,
    pub sample_data: serde_json::Value,
}

/// Request to infer schema from samples
#[derive(Debug, Deserialize, ToSchema)]
pub struct InferSchemaRequest {
    pub samples: Vec<serde_json::Value>,
}

/// Schema validation response
#[derive(Debug, Serialize, ToSchema)]
pub struct ValidationResponse {
    pub is_valid: bool,
    pub errors: Vec<ValidationErrorResponse>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ValidationErrorResponse {
    pub path: String,
    pub message: String,
    pub keyword: Option<String>,
}

/// Schema inference response
#[derive(Debug, Serialize, ToSchema)]
pub struct InferSchemaResponse {
    pub schema: serde_json::Value,
    pub ambiguities: Vec<SchemaAmbiguityResponse>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SchemaAmbiguityResponse {
    pub path: String,
    pub description: String,
    pub options: Vec<String>,
    pub suggested: String,
}

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_project_types).post(create_project_type))
        .route(
            "/{project_type_id}",
            get(get_project_type)
                .put(update_project_type)
                .delete(delete_project_type),
        )
        .route("/{project_type_id}/validate-schema", post(validate_schema))
        .route("/infer-schema", post(infer_schema))
        .route("/{project_type_id}/skills", post(add_skill_requirement))
        .route(
            "/{project_type_id}/skills/{skill_id}",
            delete(remove_skill_requirement),
        )
}

/// List project types
#[utoipa::path(
    get,
    path = "/api/v1/project-types",
    params(
        ("is_system" = Option<bool>, Query, description = "Filter system types"),
        ("search" = Option<String>, Query, description = "Search by name"),
        ("limit" = Option<i64>, Query, description = "Page size"),
        ("offset" = Option<i64>, Query, description = "Page offset"),
    ),
    responses(
        (status = 200, description = "Project type list", body = ProjectTypeListResponse),
    ),
    tag = "project-types"
)]
async fn list_project_types(
    Query(params): Query<ListProjectTypesQuery>,
    _current_user: CurrentUser,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<ProjectTypeListResponse>, ApiError> {
    let limit = params.limit.unwrap_or(20);
    let offset = params.offset.unwrap_or(0);

    let filter = ProjectTypeFilter {
        is_system: params.is_system,
        created_by: None,
        search: params.search,
        limit: Some(limit),
        offset: Some(offset),
    };

    let repo = PgProjectTypeRepository::new(pool);
    let items = repo.list(&filter).await.map_err(|e| {
        tracing::error!("Failed to list project types: {:?}", e);
        ApiError::Internal(anyhow::anyhow!("{}", e))
    })?;

    let total = items.len() as i64; // TODO: add count method to repository

    Ok(Json(ProjectTypeListResponse {
        items: items.into_iter().map(ProjectTypeResponse::from).collect(),
        total,
        limit,
        offset,
    }))
}

/// Get a project type by ID
#[utoipa::path(
    get,
    path = "/api/v1/project-types/{project_type_id}",
    params(
        ("project_type_id" = String, Path, description = "Project Type ID"),
    ),
    responses(
        (status = 200, description = "Project type details", body = ProjectTypeResponse),
        (status = 404, description = "Project type not found"),
    ),
    tag = "project-types"
)]
async fn get_project_type(
    Path(project_type_id): Path<String>,
    _current_user: CurrentUser,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<ProjectTypeResponse>, ApiError> {
    let id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    let repo = PgProjectTypeRepository::new(pool);
    let project_type = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find project type {}: {:?}", project_type_id, e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("project_type", &project_type_id))?;

    Ok(Json(ProjectTypeResponse::from(project_type)))
}

/// Create a new project type
#[utoipa::path(
    post,
    path = "/api/v1/project-types",
    request_body = CreateProjectTypeRequest,
    responses(
        (status = 201, description = "Project type created", body = ProjectTypeResponse),
        (status = 400, description = "Invalid request"),
    ),
    tag = "project-types"
)]
async fn create_project_type(
    current_user: CurrentUser,
    Extension(pool): Extension<PgPool>,
    Json(req): Json<CreateProjectTypeRequest>,
) -> Result<(StatusCode, Json<ProjectTypeResponse>), ApiError> {
    // Validate name
    if req.name.trim().is_empty() {
        return Err(ApiError::bad_request(
            "validation.name_required",
            "Project type name is required",
        ));
    }

    // Validate schemas if provided
    if let Some(schema) = &req.input_schema {
        validate_json_schema(schema)?;
    }
    if let Some(schema) = &req.output_schema {
        validate_json_schema(schema)?;
    }

    // Build domain CreateProjectType
    let create = CreateProjectType {
        name: req.name,
        description: req.description,
        input_schema: req.input_schema,
        output_schema: req.output_schema,
        estimated_duration_seconds: req.estimated_duration_seconds,
        difficulty_level: req.difficulty_level.and_then(|s| parse_difficulty(&s)),
        skill_requirements: req.skill_requirements.map(|reqs| {
            reqs.into_iter()
                .map(|r| SkillRequirement {
                    skill_id: r.skill_id,
                    min_proficiency: parse_proficiency(&r.min_proficiency),
                    is_required: r.is_required.unwrap_or(true),
                    weight: r.weight.unwrap_or(1.0),
                })
                .collect()
        }),
        is_system: Some(false),
    };

    let repo = PgProjectTypeRepository::new(pool);
    let project_type = repo
        .create(&create, Some(&current_user.user_id))
        .await
        .map_err(|e| match e {
            glyph_db::CreateProjectTypeError::NameExists(name) => ApiError::bad_request(
                "validation.name_exists",
                format!("Project type name already exists: {}", name),
            ),
            glyph_db::CreateProjectTypeError::Database(e) => {
                tracing::error!("Failed to create project type: {:?}", e);
                ApiError::Internal(anyhow::anyhow!("{}", e))
            }
        })?;

    Ok((
        StatusCode::CREATED,
        Json(ProjectTypeResponse::from(project_type)),
    ))
}

/// Update a project type
#[utoipa::path(
    put,
    path = "/api/v1/project-types/{project_type_id}",
    params(
        ("project_type_id" = String, Path, description = "Project Type ID"),
    ),
    request_body = UpdateProjectTypeRequest,
    responses(
        (status = 200, description = "Project type updated", body = ProjectTypeResponse),
        (status = 404, description = "Project type not found"),
    ),
    tag = "project-types"
)]
async fn update_project_type(
    Path(project_type_id): Path<String>,
    _current_user: CurrentUser,
    Extension(pool): Extension<PgPool>,
    Json(req): Json<UpdateProjectTypeRequest>,
) -> Result<Json<ProjectTypeResponse>, ApiError> {
    let id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    // Validate schemas if provided
    if let Some(schema) = &req.input_schema {
        validate_json_schema(schema)?;
    }
    if let Some(schema) = &req.output_schema {
        validate_json_schema(schema)?;
    }

    let update = UpdateProjectType {
        name: req.name,
        description: req.description,
        input_schema: req.input_schema,
        output_schema: req.output_schema,
        estimated_duration_seconds: req.estimated_duration_seconds,
        difficulty_level: req.difficulty_level.and_then(|s| parse_difficulty(&s)),
    };

    let repo = PgProjectTypeRepository::new(pool);
    let project_type = repo.update(&id, &update).await.map_err(|e| match e {
        glyph_db::UpdateProjectTypeError::NotFound(_) => {
            ApiError::not_found("project_type", &project_type_id)
        }
        glyph_db::UpdateProjectTypeError::Database(e) => {
            tracing::error!("Failed to update project type: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        }
    })?;

    Ok(Json(ProjectTypeResponse::from(project_type)))
}

/// Delete a project type
#[utoipa::path(
    delete,
    path = "/api/v1/project-types/{project_type_id}",
    params(
        ("project_type_id" = String, Path, description = "Project Type ID"),
    ),
    responses(
        (status = 204, description = "Project type deleted"),
        (status = 404, description = "Project type not found"),
        (status = 409, description = "Project type in use"),
    ),
    tag = "project-types"
)]
async fn delete_project_type(
    Path(project_type_id): Path<String>,
    _current_user: CurrentUser,
    Extension(pool): Extension<PgPool>,
) -> Result<StatusCode, ApiError> {
    let id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    let repo = PgProjectTypeRepository::new(pool);
    repo.delete(&id).await.map_err(|e| match e {
        glyph_db::DeleteProjectTypeError::NotFound(_) => {
            ApiError::not_found("project_type", &project_type_id)
        }
        glyph_db::DeleteProjectTypeError::InUse => {
            ApiError::conflict("project_type.in_use", "Project type is in use by projects")
        }
        glyph_db::DeleteProjectTypeError::Database(e) => {
            tracing::error!("Failed to delete project type: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        }
    })?;

    Ok(StatusCode::NO_CONTENT)
}

/// Validate schema against sample data
#[utoipa::path(
    post,
    path = "/api/v1/project-types/{project_type_id}/validate-schema",
    params(
        ("project_type_id" = String, Path, description = "Project Type ID"),
    ),
    request_body = ValidateSchemaRequest,
    responses(
        (status = 200, description = "Validation result", body = ValidationResponse),
        (status = 400, description = "Invalid schema"),
    ),
    tag = "project-types"
)]
async fn validate_schema(
    Path(_project_type_id): Path<String>,
    Json(req): Json<ValidateSchemaRequest>,
) -> Result<Json<ValidationResponse>, ApiError> {
    let service = SchemaValidationService::new();

    let result = service
        .validate(&req.schema, &req.sample_data)
        .await
        .map_err(|e| ApiError::bad_request("schema.invalid", e.to_string()))?;

    Ok(Json(ValidationResponse {
        is_valid: result.is_valid,
        errors: result
            .errors
            .into_iter()
            .map(|e| ValidationErrorResponse {
                path: e.path,
                message: e.message,
                keyword: e.keyword,
            })
            .collect(),
    }))
}

/// Infer schema from sample data
#[utoipa::path(
    post,
    path = "/api/v1/project-types/infer-schema",
    request_body = InferSchemaRequest,
    responses(
        (status = 200, description = "Inferred schema", body = InferSchemaResponse),
        (status = 400, description = "Invalid samples"),
    ),
    tag = "project-types"
)]
async fn infer_schema(
    Json(req): Json<InferSchemaRequest>,
) -> Result<Json<InferSchemaResponse>, ApiError> {
    if req.samples.is_empty() {
        return Err(ApiError::bad_request(
            "validation.samples_required",
            "At least one sample is required",
        ));
    }

    let service = SchemaValidationService::new();
    let result = service.infer_schema(&req.samples);

    Ok(Json(InferSchemaResponse {
        schema: result.schema,
        ambiguities: result
            .ambiguities
            .into_iter()
            .map(|a| SchemaAmbiguityResponse {
                path: a.path,
                description: a.description,
                options: a.options,
                suggested: a.suggested,
            })
            .collect(),
    }))
}

/// Add skill requirement to project type
#[utoipa::path(
    post,
    path = "/api/v1/project-types/{project_type_id}/skills",
    params(
        ("project_type_id" = String, Path, description = "Project Type ID"),
    ),
    request_body = SkillRequirementRequest,
    responses(
        (status = 201, description = "Skill requirement added"),
        (status = 404, description = "Project type not found"),
    ),
    tag = "project-types"
)]
async fn add_skill_requirement(
    Path(project_type_id): Path<String>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
    Json(req): Json<SkillRequirementRequest>,
) -> Result<StatusCode, ApiError> {
    let id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    let requirement = SkillRequirement {
        skill_id: req.skill_id,
        min_proficiency: parse_proficiency(&req.min_proficiency),
        is_required: req.is_required.unwrap_or(true),
        weight: req.weight.unwrap_or(1.0),
    };

    let repo = PgProjectTypeRepository::new(pool);
    repo.add_skill_requirement(&id, &requirement)
        .await
        .map_err(|e| match e {
            glyph_db::AddSkillRequirementError::ProjectTypeNotFound => {
                ApiError::not_found("project_type", &project_type_id)
            }
            glyph_db::AddSkillRequirementError::Database(e) => {
                tracing::error!("Failed to add skill requirement: {:?}", e);
                ApiError::Internal(anyhow::anyhow!("{}", e))
            }
        })?;

    Ok(StatusCode::CREATED)
}

/// Remove skill requirement from project type
#[utoipa::path(
    delete,
    path = "/api/v1/project-types/{project_type_id}/skills/{skill_id}",
    params(
        ("project_type_id" = String, Path, description = "Project Type ID"),
        ("skill_id" = String, Path, description = "Skill ID to remove"),
    ),
    responses(
        (status = 204, description = "Skill requirement removed"),
        (status = 404, description = "Not found"),
    ),
    tag = "project-types"
)]
async fn remove_skill_requirement(
    Path((project_type_id, skill_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    _current_user: CurrentUser,
) -> Result<StatusCode, ApiError> {
    let id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    let repo = PgProjectTypeRepository::new(pool);
    repo.remove_skill_requirement(&id, &skill_id)
        .await
        .map_err(|e| match e {
            glyph_db::RemoveSkillRequirementError::NotFound => {
                ApiError::not_found("skill_requirement", &skill_id)
            }
            glyph_db::RemoveSkillRequirementError::Database(e) => {
                tracing::error!("Failed to remove skill requirement: {:?}", e);
                ApiError::Internal(anyhow::anyhow!("{}", e))
            }
        })?;

    Ok(StatusCode::NO_CONTENT)
}

// =============================================================================
// Helper functions
// =============================================================================

/// Validate that a value is a valid JSON Schema
fn validate_json_schema(schema: &serde_json::Value) -> Result<(), ApiError> {
    // Basic validation - must be an object
    if !schema.is_object() {
        return Err(ApiError::bad_request(
            "schema.invalid_format",
            "Schema must be a JSON object",
        ));
    }

    // Try to compile the schema
    jsonschema::validator_for(schema)
        .map_err(|e| ApiError::bad_request("schema.invalid", e.to_string()))?;

    Ok(())
}

fn format_difficulty(level: DifficultyLevel) -> String {
    match level {
        DifficultyLevel::Easy => "easy".to_string(),
        DifficultyLevel::Medium => "medium".to_string(),
        DifficultyLevel::Hard => "hard".to_string(),
        DifficultyLevel::Expert => "expert".to_string(),
    }
}

fn parse_difficulty(s: &str) -> Option<DifficultyLevel> {
    match s.to_lowercase().as_str() {
        "easy" => Some(DifficultyLevel::Easy),
        "medium" => Some(DifficultyLevel::Medium),
        "hard" => Some(DifficultyLevel::Hard),
        "expert" => Some(DifficultyLevel::Expert),
        _ => None,
    }
}

fn format_proficiency(level: ProficiencyLevel) -> String {
    match level {
        ProficiencyLevel::Novice => "novice".to_string(),
        ProficiencyLevel::Intermediate => "intermediate".to_string(),
        ProficiencyLevel::Advanced => "advanced".to_string(),
        ProficiencyLevel::Expert => "expert".to_string(),
    }
}

fn parse_proficiency(s: &str) -> ProficiencyLevel {
    match s.to_lowercase().as_str() {
        "novice" => ProficiencyLevel::Novice,
        "intermediate" => ProficiencyLevel::Intermediate,
        "advanced" => ProficiencyLevel::Advanced,
        "expert" => ProficiencyLevel::Expert,
        _ => ProficiencyLevel::Intermediate,
    }
}
