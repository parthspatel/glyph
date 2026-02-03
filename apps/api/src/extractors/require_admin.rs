//! RequireAdmin extractor for admin-only routes.

use axum::{extract::FromRequestParts, http::request::Parts};

use crate::{error::ApiError, extractors::CurrentUser};

/// Extractor that requires the current user to have Admin role.
///
/// Usage:
/// ```ignore
/// async fn admin_endpoint(RequireAdmin(user): RequireAdmin) -> impl IntoResponse {
///     // user is guaranteed to be admin
/// }
/// ```
pub struct RequireAdmin(pub CurrentUser);

impl<S> FromRequestParts<S> for RequireAdmin
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = CurrentUser::from_request_parts(parts, state).await?;

        if !user.has_role("admin") {
            return Err(ApiError::Forbidden {
                message: "Requires admin role".to_string(),
            });
        }

        Ok(RequireAdmin(user))
    }
}
