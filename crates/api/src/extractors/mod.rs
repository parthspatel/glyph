//! Custom Axum extractors

use axum::{extract::FromRequestParts, http::request::Parts};
use uuid::Uuid;

use crate::ApiError;

/// Extract the current user ID from the request
pub struct CurrentUser(pub Uuid);

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Placeholder - will extract from auth token
        // For now, return a dummy user ID
        parts
            .extensions
            .get::<Uuid>()
            .copied()
            .map(CurrentUser)
            .ok_or(ApiError::Unauthorized)
    }
}
