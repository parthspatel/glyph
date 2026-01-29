//! Project Type CRUD endpoints

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use glyph_domain::{ProjectTypeId, SkillRequirement};

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
            min_proficiency: format!("{:?}", sr.min_proficiency).to_lowercase(),
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
) -> Result<Json<ProjectTypeListResponse>, ApiError> {
    let limit = params.limit.unwrap_or(20);
    let offset = params.offset.unwrap_or(0);

    // Placeholder - will implement with actual DB query
    Ok(Json(ProjectTypeListResponse {
        items: vec![],
        total: 0,
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
) -> Result<Json<ProjectTypeResponse>, ApiError> {
    let _id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    // Placeholder
    Err(ApiError::not_found("project_type", &project_type_id))
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

    // Placeholder response
    let response = ProjectTypeResponse {
        project_type_id: ProjectTypeId::new().to_string(),
        name: req.name,
        description: req.description,
        input_schema: req.input_schema.unwrap_or(serde_json::json!({})),
        output_schema: req.output_schema.unwrap_or(serde_json::json!({})),
        estimated_duration_seconds: req.estimated_duration_seconds,
        difficulty_level: req.difficulty_level,
        skill_requirements: req
            .skill_requirements
            .map(|reqs| {
                reqs.into_iter()
                    .map(|r| SkillRequirementResponse {
                        skill_id: r.skill_id,
                        min_proficiency: r.min_proficiency,
                        is_required: r.is_required.unwrap_or(true),
                        weight: r.weight.unwrap_or(1.0),
                    })
                    .collect()
            })
            .unwrap_or_default(),
        is_system: false,
        created_by: Some(current_user.user_id.to_string()),
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
        usage_count: 0,
    };

    Ok((StatusCode::CREATED, Json(response)))
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
    Json(_req): Json<UpdateProjectTypeRequest>,
) -> Result<Json<ProjectTypeResponse>, ApiError> {
    let _id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    // Placeholder
    Err(ApiError::not_found("project_type", &project_type_id))
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
) -> Result<StatusCode, ApiError> {
    let _id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    // Placeholder - will check if type is in use before deleting
    Err(ApiError::not_found("project_type", &project_type_id))
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
    _current_user: CurrentUser,
    Json(_req): Json<SkillRequirementRequest>,
) -> Result<StatusCode, ApiError> {
    let _id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    // Placeholder
    Err(ApiError::not_found("project_type", &project_type_id))
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
    Path((project_type_id, _skill_id)): Path<(String, String)>,
    _current_user: CurrentUser,
) -> Result<StatusCode, ApiError> {
    let _id: ProjectTypeId = project_type_id
        .parse()
        .map_err(|_| ApiError::not_found("project_type", &project_type_id))?;

    // Placeholder
    Err(ApiError::not_found("project_type", &project_type_id))
}

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
