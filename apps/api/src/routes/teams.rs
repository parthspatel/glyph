//! Team management endpoints

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Extension, Json,
};
use glyph_db::{NewTeam, Pagination, PgTeamRepository, TeamRepository, TeamTreeNode, TeamUpdate};
use glyph_domain::{TeamId, TeamRole, UserId};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;

use crate::error::ApiError;
use crate::extractors::{CurrentUser, RequireAdmin};
use crate::services::PermissionService;

// =============================================================================
// Response Types
// =============================================================================

/// List response for teams
#[derive(Debug, Serialize, ToSchema)]
pub struct TeamListResponse {
    pub items: Vec<TeamSummary>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Summary view of a team for list responses
#[derive(Debug, Serialize, ToSchema)]
pub struct TeamSummary {
    pub team_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub parent_team_id: Option<String>,
    pub member_count: i64,
    pub sub_team_count: i64,
}

/// Detailed team response
#[derive(Debug, Serialize, ToSchema)]
pub struct TeamDetailResponse {
    pub team_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub parent_team_id: Option<String>,
    pub capacity: Option<i32>,
    pub specializations: Vec<String>,
    pub member_count: i64,
    pub leader_count: i64,
    pub sub_teams: Vec<TeamSummary>,
    pub created_at: String,
    pub updated_at: String,
}

/// Team tree response
#[derive(Debug, Serialize, ToSchema)]
pub struct TeamTreeResponse {
    pub items: Vec<TeamTreeNodeResponse>,
}

/// Single node in team hierarchy tree
#[derive(Debug, Serialize, ToSchema)]
pub struct TeamTreeNodeResponse {
    pub team_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub depth: i32,
    pub member_count: i64,
    pub sub_team_count: i64,
}

impl From<TeamTreeNode> for TeamTreeNodeResponse {
    fn from(n: TeamTreeNode) -> Self {
        Self {
            team_id: n.team.team_id.to_string(),
            name: n.team.name,
            description: n.team.description,
            status: format!("{:?}", n.team.status).to_lowercase(),
            depth: n.depth,
            member_count: n.member_count,
            sub_team_count: n.sub_team_count,
        }
    }
}

// =============================================================================
// Request Types
// =============================================================================

/// Create team request
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTeamRequest {
    pub name: String,
    pub description: Option<String>,
    pub parent_team_id: Option<String>,
    pub capacity: Option<i32>,
    #[serde(default)]
    pub specializations: Vec<String>,
    pub initial_leader_id: Option<String>,
}

/// Update team request
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateTeamRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub capacity: Option<i32>,
    pub specializations: Option<Vec<String>>,
}

/// Query parameters for listing teams
#[derive(Debug, Deserialize)]
pub struct ListTeamsParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub root_only: Option<bool>,
}

// =============================================================================
// Handlers
// =============================================================================

/// List all teams with pagination
#[utoipa::path(
    get,
    path = "/teams",
    tag = "teams",
    params(
        ("limit" = Option<i64>, Query, description = "Max results per page"),
        ("offset" = Option<i64>, Query, description = "Number of items to skip"),
        ("root_only" = Option<bool>, Query, description = "Only return root teams (no parent)")
    ),
    responses(
        (status = 200, description = "List of teams", body = TeamListResponse)
    )
)]
pub async fn list_teams(
    _user: CurrentUser,
    Query(params): Query<ListTeamsParams>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<TeamListResponse>, ApiError> {
    let pagination = Pagination {
        limit: params.limit.unwrap_or(20),
        offset: params.offset.unwrap_or(0),
        sort_by: None,
        sort_order: Default::default(),
    };

    let repo = PgTeamRepository::new(pool);
    let page = if params.root_only.unwrap_or(false) {
        repo.list_root_teams(pagination).await
    } else {
        repo.list(pagination).await
    }
    .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;

    // Get counts for each team
    let mut items = Vec::with_capacity(page.items.len());
    for team in page.items {
        let member_count = repo.get_member_count(&team.team_id).await.unwrap_or(0);
        let sub_teams = repo.get_sub_teams(&team.team_id).await.unwrap_or_default();
        items.push(TeamSummary {
            team_id: team.team_id.to_string(),
            name: team.name,
            description: team.description,
            status: format!("{:?}", team.status).to_lowercase(),
            parent_team_id: team.parent_team_id.map(|id| id.to_string()),
            member_count,
            sub_team_count: sub_teams.len() as i64,
        });
    }

    Ok(Json(TeamListResponse {
        items,
        total: page.total,
        limit: page.limit,
        offset: page.offset,
    }))
}

/// Get team by ID
#[utoipa::path(
    get,
    path = "/teams/{team_id}",
    tag = "teams",
    params(("team_id" = String, Path, description = "Team ID")),
    responses(
        (status = 200, description = "Team found", body = TeamDetailResponse),
        (status = 404, description = "Team not found")
    )
)]
pub async fn get_team(
    _user: CurrentUser,
    Path(team_id): Path<String>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<TeamDetailResponse>, ApiError> {
    let id: TeamId = team_id.parse()?;

    let repo = PgTeamRepository::new(pool);
    let team = repo
        .find_by_id(&id)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?
        .ok_or_else(|| ApiError::not_found("team", team_id.clone()))?;

    let sub_teams = repo
        .get_sub_teams(&id)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;

    let members = repo
        .list_members(&id, Pagination::default())
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;

    let leader_count = members
        .items
        .iter()
        .filter(|m| m.role == TeamRole::Leader)
        .count() as i64;

    Ok(Json(TeamDetailResponse {
        team_id: team.team_id.to_string(),
        name: team.name,
        description: team.description,
        status: format!("{:?}", team.status).to_lowercase(),
        parent_team_id: team.parent_team_id.map(|id| id.to_string()),
        capacity: team.capacity,
        specializations: team.specializations,
        member_count: members.total,
        leader_count,
        sub_teams: sub_teams
            .into_iter()
            .map(|t| TeamSummary {
                team_id: t.team_id.to_string(),
                name: t.name,
                description: t.description,
                status: format!("{:?}", t.status).to_lowercase(),
                parent_team_id: t.parent_team_id.map(|id| id.to_string()),
                member_count: 0,
                sub_team_count: 0,
            })
            .collect(),
        created_at: team.created_at.to_rfc3339(),
        updated_at: team.updated_at.to_rfc3339(),
    }))
}

/// Get team hierarchy tree
#[utoipa::path(
    get,
    path = "/teams/{team_id}/tree",
    tag = "teams",
    params(("team_id" = String, Path, description = "Team ID")),
    responses(
        (status = 200, description = "Team hierarchy tree", body = TeamTreeResponse)
    )
)]
pub async fn get_team_tree(
    _user: CurrentUser,
    Path(team_id): Path<String>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<TeamTreeResponse>, ApiError> {
    let id: TeamId = team_id.parse()?;
    let repo = PgTeamRepository::new(pool);
    let tree = repo
        .get_team_tree(&id)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;
    Ok(Json(TeamTreeResponse {
        items: tree.into_iter().map(TeamTreeNodeResponse::from).collect(),
    }))
}

/// Create a new team
#[utoipa::path(
    post,
    path = "/teams",
    tag = "teams",
    request_body = CreateTeamRequest,
    responses(
        (status = 201, description = "Team created", body = TeamDetailResponse),
        (status = 400, description = "Invalid request"),
        (status = 403, description = "Admin only")
    )
)]
pub async fn create_team(
    RequireAdmin(_admin): RequireAdmin,
    Extension(pool): Extension<PgPool>,
    Json(body): Json<CreateTeamRequest>,
) -> Result<(StatusCode, Json<TeamDetailResponse>), ApiError> {
    let repo = PgTeamRepository::new(pool);

    // Validate parent exists if provided
    let parent_team_id = if let Some(ref parent_id_str) = body.parent_team_id {
        let parent_id: TeamId = parent_id_str.parse()?;
        let _ = repo
            .find_by_id(&parent_id)
            .await
            .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?
            .ok_or_else(|| {
                ApiError::bad_request("team.parent.not_found", "Parent team not found")
            })?;
        Some(parent_id)
    } else {
        None
    };

    let initial_leader_id: Option<UserId> =
        body.initial_leader_id.map(|s| s.parse()).transpose()?;

    let new_team = NewTeam {
        name: body.name,
        description: body.description,
        parent_team_id,
        capacity: body.capacity,
        specializations: body.specializations,
        initial_leader_id: initial_leader_id.clone(),
    };

    let team = repo
        .create(&new_team)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;

    Ok((
        StatusCode::CREATED,
        Json(TeamDetailResponse {
            team_id: team.team_id.to_string(),
            name: team.name,
            description: team.description,
            status: format!("{:?}", team.status).to_lowercase(),
            parent_team_id: team.parent_team_id.map(|id| id.to_string()),
            capacity: team.capacity,
            specializations: team.specializations,
            member_count: if initial_leader_id.is_some() { 1 } else { 0 },
            leader_count: if initial_leader_id.is_some() { 1 } else { 0 },
            sub_teams: vec![],
            created_at: team.created_at.to_rfc3339(),
            updated_at: team.updated_at.to_rfc3339(),
        }),
    ))
}

/// Update a team
#[utoipa::path(
    patch,
    path = "/teams/{team_id}",
    tag = "teams",
    params(("team_id" = String, Path, description = "Team ID")),
    request_body = UpdateTeamRequest,
    responses(
        (status = 200, description = "Team updated", body = TeamDetailResponse),
        (status = 404, description = "Team not found"),
        (status = 403, description = "Requires team leadership or admin")
    )
)]
pub async fn update_team(
    current_user: CurrentUser,
    Path(team_id): Path<String>,
    Extension(pool): Extension<PgPool>,
    Json(body): Json<UpdateTeamRequest>,
) -> Result<Json<TeamDetailResponse>, ApiError> {
    let id: TeamId = team_id.parse()?;

    // Check permission: admin or team leader
    if !current_user.has_role("admin") {
        let permission_service = PermissionService::new(pool.clone());
        let is_leader = permission_service
            .check_team_leadership_cascade(&current_user.user_id, &id)
            .await
            .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;
        if !is_leader {
            return Err(ApiError::Forbidden {
                permission: format!("team:lead({}) or role:admin", id),
            });
        }
    }

    let update = TeamUpdate {
        name: body.name,
        description: body.description,
        status: body.status.and_then(|s| parse_team_status_opt(&s)),
        capacity: body.capacity,
        specializations: body.specializations,
    };

    let repo = PgTeamRepository::new(pool);
    let team = repo.update(&id, &update).await.map_err(|e| match e {
        glyph_db::UpdateTeamError::NotFound(id) => ApiError::not_found("team", id.to_string()),
        glyph_db::UpdateTeamError::Database(e) => ApiError::Internal(anyhow::anyhow!("{}", e)),
    })?;

    Ok(Json(TeamDetailResponse {
        team_id: team.team_id.to_string(),
        name: team.name,
        description: team.description,
        status: format!("{:?}", team.status).to_lowercase(),
        parent_team_id: team.parent_team_id.map(|id| id.to_string()),
        capacity: team.capacity,
        specializations: team.specializations,
        member_count: 0,
        leader_count: 0,
        sub_teams: vec![],
        created_at: team.created_at.to_rfc3339(),
        updated_at: team.updated_at.to_rfc3339(),
    }))
}

/// Delete a team (soft delete)
#[utoipa::path(
    delete,
    path = "/teams/{team_id}",
    tag = "teams",
    params(("team_id" = String, Path, description = "Team ID")),
    responses(
        (status = 204, description = "Team deleted"),
        (status = 404, description = "Team not found"),
        (status = 403, description = "Admin only")
    )
)]
pub async fn delete_team(
    RequireAdmin(_admin): RequireAdmin,
    Path(team_id): Path<String>,
    Extension(pool): Extension<PgPool>,
) -> Result<StatusCode, ApiError> {
    let id: TeamId = team_id.parse()?;
    let repo = PgTeamRepository::new(pool);
    repo.soft_delete(&id).await.map_err(|e| match e {
        glyph_db::UpdateTeamError::NotFound(id) => ApiError::not_found("team", id.to_string()),
        glyph_db::UpdateTeamError::Database(e) => ApiError::Internal(anyhow::anyhow!("{}", e)),
    })?;
    Ok(StatusCode::NO_CONTENT)
}

fn parse_team_status_opt(s: &str) -> Option<glyph_domain::TeamStatus> {
    match s.to_lowercase().as_str() {
        "active" => Some(glyph_domain::TeamStatus::Active),
        "inactive" => Some(glyph_domain::TeamStatus::Inactive),
        _ => None,
    }
}

// =============================================================================
// Routes
// =============================================================================

/// Build team routes
pub fn routes() -> axum::Router {
    use axum::routing::get;

    axum::Router::new()
        .route("/", get(list_teams).post(create_team))
        .route(
            "/{team_id}",
            get(get_team).patch(update_team).delete(delete_team),
        )
        .route("/{team_id}/tree", get(get_team_tree))
}
