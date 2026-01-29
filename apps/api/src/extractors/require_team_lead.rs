//! RequireTeamLead extractor for team-scoped operations.

use axum::{extract::FromRequestParts, http::request::Parts};
use glyph_domain::TeamId;

use crate::{error::ApiError, extractors::CurrentUser, services::PermissionService};

/// Extractor that requires the current user to lead the specified team.
///
/// Leadership cascades: if user leads a parent team, they lead all sub-teams.
/// Admins automatically pass this check.
///
/// Extracts team_id from path parameter (looks for `team_` prefix in URL path).
///
/// Usage:
/// ```ignore
/// async fn team_endpoint(
///     RequireTeamLead { user, team_id }: RequireTeamLead
/// ) -> impl IntoResponse {
///     // user is guaranteed to lead this team
/// }
/// ```
pub struct RequireTeamLead {
    pub user: CurrentUser,
    pub team_id: TeamId,
}

impl<S> FromRequestParts<S> for RequireTeamLead
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        // Get current user first
        let user = CurrentUser::from_request_parts(parts, state).await?;

        // Extract team_id from path - look for team_ prefix in path segments
        let team_id_str = parts
            .uri
            .path()
            .split('/')
            .find(|s| s.starts_with("team_"))
            .ok_or_else(|| {
                ApiError::bad_request("path.team_id.missing", "Team ID not found in path")
            })?;

        let team_id: TeamId = team_id_str
            .parse()
            .map_err(|e: glyph_domain::IdParseError| {
                ApiError::bad_request("team.id.invalid", e.to_string())
            })?;

        // Admins bypass team leadership check
        if user.has_role("admin") {
            return Ok(RequireTeamLead { user, team_id });
        }

        // Get database pool from extensions
        let pool = parts
            .extensions
            .get::<sqlx::PgPool>()
            .ok_or_else(|| ApiError::Internal(anyhow::anyhow!("Database pool not configured")))?
            .clone();

        let permission_service = PermissionService::new(pool);

        // Check team leadership with cascade
        let has_permission = permission_service
            .check_team_leadership_cascade(&user.user_id, &team_id)
            .await
            .map_err(|e| ApiError::Internal(anyhow::anyhow!("Permission check failed: {}", e)))?;

        if !has_permission {
            return Err(ApiError::Forbidden {
                permission: format!("team:lead({})", team_id),
            });
        }

        Ok(RequireTeamLead { user, team_id })
    }
}
