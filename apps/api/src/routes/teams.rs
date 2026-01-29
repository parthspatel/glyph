//! Team management endpoints

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Extension, Json,
};
use glyph_db::{
    NewTeam, Pagination, PgTeamRepository, PgUserRepository, TeamMembershipError,
    TeamMembershipWithUser, TeamRepository, TeamTreeNode, TeamUpdate, UserRepository,
};
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

/// Team member response
#[derive(Debug, Serialize, ToSchema)]
pub struct TeamMemberResponse {
    pub user_id: String,
    pub display_name: String,
    pub email: String,
    pub role: String,
    pub joined_at: String,
    pub allocation_percentage: Option<i32>,
}

impl From<TeamMembershipWithUser> for TeamMemberResponse {
    fn from(m: TeamMembershipWithUser) -> Self {
        Self {
            user_id: m.user_id.to_string(),
            display_name: m.display_name,
            email: m.email,
            role: format!("{:?}", m.role).to_lowercase(),
            joined_at: m.joined_at.to_rfc3339(),
            allocation_percentage: m.allocation_percentage,
        }
    }
}

/// List response for team members
#[derive(Debug, Serialize, ToSchema)]
pub struct TeamMemberListResponse {
    pub items: Vec<TeamMemberResponse>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
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

/// Add team member request
#[derive(Debug, Deserialize, ToSchema)]
pub struct AddMemberRequest {
    pub user_id: String,
    /// Role: "leader" or "member", defaults to "member"
    #[serde(default)]
    pub role: Option<String>,
    pub allocation_percentage: Option<i32>,
}

/// Update team member request
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateMemberRequest {
    pub role: Option<String>,
    pub allocation_percentage: Option<i32>,
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

    let team = repo.create(&new_team).await.map_err(|e| {
        tracing::error!("Failed to create team: {:?}", e);
        ApiError::Internal(anyhow::anyhow!("{}", e))
    })?;

    tracing::debug!("Team created successfully: {:?}", team.team_id);

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
// Team Membership Handlers
// =============================================================================

/// List team members
#[utoipa::path(
    get,
    path = "/teams/{team_id}/members",
    tag = "teams",
    params(
        ("team_id" = String, Path, description = "Team ID"),
        ("limit" = Option<i64>, Query, description = "Max results"),
        ("offset" = Option<i64>, Query, description = "Offset")
    ),
    responses(
        (status = 200, description = "Team members", body = TeamMemberListResponse),
        (status = 404, description = "Team not found")
    )
)]
pub async fn list_team_members(
    _user: CurrentUser,
    Path(team_id): Path<String>,
    Query(pagination): Query<Pagination>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<TeamMemberListResponse>, ApiError> {
    let id: TeamId = team_id.parse()?;

    let repo = PgTeamRepository::new(pool);

    // Verify team exists
    let _ = repo
        .find_by_id(&id)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?
        .ok_or_else(|| ApiError::not_found("team", team_id))?;

    let page = repo
        .list_members(&id, pagination)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;

    Ok(Json(TeamMemberListResponse {
        items: page
            .items
            .into_iter()
            .map(TeamMemberResponse::from)
            .collect(),
        total: page.total,
        limit: page.limit,
        offset: page.offset,
    }))
}

/// Add a member to a team
#[utoipa::path(
    post,
    path = "/teams/{team_id}/members",
    tag = "teams",
    params(("team_id" = String, Path, description = "Team ID")),
    request_body = AddMemberRequest,
    responses(
        (status = 201, description = "Member added", body = TeamMemberResponse),
        (status = 400, description = "Invalid request"),
        (status = 403, description = "Requires team leadership"),
        (status = 404, description = "Team or user not found"),
        (status = 409, description = "User already a member")
    )
)]
pub async fn add_team_member(
    current_user: CurrentUser,
    Path(team_id): Path<String>,
    Extension(pool): Extension<PgPool>,
    Json(body): Json<AddMemberRequest>,
) -> Result<(StatusCode, Json<TeamMemberResponse>), ApiError> {
    let id: TeamId = team_id.parse()?;

    // Check permission: admin or team leader (with cascade)
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

    let member_user_id: UserId = body.user_id.parse()?;

    let user_repo = PgUserRepository::new(pool.clone());
    // Verify user exists
    let user = user_repo
        .find_by_id(&member_user_id)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?
        .ok_or_else(|| ApiError::not_found("user", body.user_id.clone()))?;

    let role = match body.role.as_deref() {
        Some("leader") => TeamRole::Leader,
        Some("member") | None => TeamRole::Member,
        Some(r) => {
            return Err(ApiError::bad_request(
                "team.role.invalid",
                format!("Invalid role: {}. Must be 'leader' or 'member'", r),
            ))
        }
    };

    let repo = PgTeamRepository::new(pool);
    let membership = repo
        .add_member(&id, &member_user_id, role, body.allocation_percentage)
        .await
        .map_err(|e| match e {
            TeamMembershipError::AlreadyMember => ApiError::conflict(
                "team.member.exists",
                "User is already a member of this team",
            ),
            TeamMembershipError::NotAMember => {
                ApiError::Internal(anyhow::anyhow!("Unexpected: not member after add"))
            }
            TeamMembershipError::Database(e) => ApiError::Internal(anyhow::anyhow!("{}", e)),
            TeamMembershipError::TeamNotFound(id) => ApiError::not_found("team", id.to_string()),
            TeamMembershipError::UserNotFound(id) => ApiError::not_found("user", id.to_string()),
        })?;

    Ok((
        StatusCode::CREATED,
        Json(TeamMemberResponse {
            user_id: membership.user_id.to_string(),
            display_name: user.display_name,
            email: user.email,
            role: format!("{:?}", membership.role).to_lowercase(),
            joined_at: membership.joined_at.to_rfc3339(),
            allocation_percentage: membership.allocation_percentage,
        }),
    ))
}

/// Remove a member from a team
#[utoipa::path(
    delete,
    path = "/teams/{team_id}/members/{user_id}",
    tag = "teams",
    params(
        ("team_id" = String, Path, description = "Team ID"),
        ("user_id" = String, Path, description = "User ID to remove")
    ),
    responses(
        (status = 204, description = "Member removed"),
        (status = 400, description = "Cannot remove last leader"),
        (status = 403, description = "Requires team leadership"),
        (status = 404, description = "Member not found")
    )
)]
pub async fn remove_team_member(
    current_user: CurrentUser,
    Path((team_id, user_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
) -> Result<StatusCode, ApiError> {
    let id: TeamId = team_id.parse()?;
    let member_user_id: UserId = user_id.parse()?;

    // Check permission
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

    let repo = PgTeamRepository::new(pool);

    // Prevent removing last leader
    let members = repo
        .list_members(&id, Pagination::default())
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;

    let leader_count = members
        .items
        .iter()
        .filter(|m| m.role == TeamRole::Leader)
        .count();

    let is_removing_leader = members
        .items
        .iter()
        .any(|m| m.user_id == member_user_id && m.role == TeamRole::Leader);

    if is_removing_leader && leader_count <= 1 {
        return Err(ApiError::bad_request(
            "team.last_leader",
            "Cannot remove the last leader. Promote another member to leader first.",
        ));
    }

    repo.remove_member(&id, &member_user_id)
        .await
        .map_err(|e| match e {
            TeamMembershipError::NotAMember => {
                ApiError::not_found("team_member", format!("{}:{}", team_id, user_id))
            }
            TeamMembershipError::AlreadyMember => {
                ApiError::Internal(anyhow::anyhow!("Unexpected error"))
            }
            TeamMembershipError::Database(e) => ApiError::Internal(anyhow::anyhow!("{}", e)),
            TeamMembershipError::TeamNotFound(id) => ApiError::not_found("team", id.to_string()),
            TeamMembershipError::UserNotFound(id) => ApiError::not_found("user", id.to_string()),
        })?;

    Ok(StatusCode::NO_CONTENT)
}

/// Update a team member's role or allocation
#[utoipa::path(
    patch,
    path = "/teams/{team_id}/members/{user_id}",
    tag = "teams",
    params(
        ("team_id" = String, Path, description = "Team ID"),
        ("user_id" = String, Path, description = "User ID to update")
    ),
    request_body = UpdateMemberRequest,
    responses(
        (status = 200, description = "Member updated", body = TeamMemberResponse),
        (status = 400, description = "Cannot demote last leader"),
        (status = 403, description = "Requires team leadership"),
        (status = 404, description = "Member not found")
    )
)]
pub async fn update_team_member(
    current_user: CurrentUser,
    Path((team_id, user_id)): Path<(String, String)>,
    Extension(pool): Extension<PgPool>,
    Json(body): Json<UpdateMemberRequest>,
) -> Result<Json<TeamMemberResponse>, ApiError> {
    let id: TeamId = team_id.parse()?;
    let member_user_id: UserId = user_id.parse()?;

    // Check permission
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

    let new_role = body
        .role
        .as_ref()
        .map(|r| match r.as_str() {
            "leader" => Ok(TeamRole::Leader),
            "member" => Ok(TeamRole::Member),
            _ => Err(ApiError::bad_request(
                "team.role.invalid",
                format!("Invalid role: {}", r),
            )),
        })
        .transpose()?;

    let repo = PgTeamRepository::new(pool.clone());

    // If demoting from leader, check not last leader
    if new_role == Some(TeamRole::Member) {
        let members = repo
            .list_members(&id, Pagination::default())
            .await
            .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?;

        let current_member = members.items.iter().find(|m| m.user_id == member_user_id);

        if let Some(m) = current_member {
            if m.role == TeamRole::Leader {
                let leader_count = members
                    .items
                    .iter()
                    .filter(|m| m.role == TeamRole::Leader)
                    .count();

                if leader_count <= 1 {
                    return Err(ApiError::bad_request(
                        "team.last_leader",
                        "Cannot demote the last leader. Promote another member to leader first.",
                    ));
                }
            }
        }
    }

    let membership = repo
        .update_member(&id, &member_user_id, new_role, body.allocation_percentage)
        .await
        .map_err(|e| match e {
            TeamMembershipError::NotAMember => {
                ApiError::not_found("team_member", format!("{}:{}", team_id, user_id))
            }
            TeamMembershipError::AlreadyMember => {
                ApiError::Internal(anyhow::anyhow!("Unexpected error"))
            }
            TeamMembershipError::Database(e) => ApiError::Internal(anyhow::anyhow!("{}", e)),
            TeamMembershipError::TeamNotFound(id) => ApiError::not_found("team", id.to_string()),
            TeamMembershipError::UserNotFound(id) => ApiError::not_found("user", id.to_string()),
        })?;

    // Get user details for response
    let user_repo = PgUserRepository::new(pool);
    let user = user_repo
        .find_by_id(&member_user_id)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!("{}", e)))?
        .ok_or_else(|| ApiError::Internal(anyhow::anyhow!("User not found")))?;

    Ok(Json(TeamMemberResponse {
        user_id: membership.user_id.to_string(),
        display_name: user.display_name,
        email: user.email,
        role: format!("{:?}", membership.role).to_lowercase(),
        joined_at: membership.joined_at.to_rfc3339(),
        allocation_percentage: membership.allocation_percentage,
    }))
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
        .route(
            "/{team_id}/members",
            get(list_team_members).post(add_team_member),
        )
        .route(
            "/{team_id}/members/{user_id}",
            get(list_team_members)
                .patch(update_team_member)
                .delete(remove_team_member),
        )
}
