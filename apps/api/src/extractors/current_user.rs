//! CurrentUser extractor for authenticated requests.
//!
//! Extracts and validates the JWT from cookies to provide
//! authenticated user context in route handlers.

use std::sync::Arc;

use axum::{extract::FromRequestParts, http::request::Parts};
use axum_extra::extract::cookie::CookieJar;
use glyph_auth::{validate_jwt, Auth0Config, Claims, JwksCache, ACCESS_TOKEN_COOKIE};
use glyph_domain::UserId;

use crate::ApiError;

/// Shared authentication state available via request extensions.
#[derive(Clone)]
pub struct AuthState {
    /// JWKS cache for JWT validation
    pub jwks_cache: Arc<JwksCache>,
    /// Auth0 configuration
    pub auth0_config: Arc<Auth0Config>,
}

/// Authenticated user context extracted from JWT.
///
/// Use this extractor in route handlers to require authentication:
///
/// ```ignore
/// async fn protected_route(user: CurrentUser) -> impl IntoResponse {
///     format!("Hello, {}!", user.email.unwrap_or("anonymous".into()))
/// }
/// ```
#[derive(Debug, Clone)]
pub struct CurrentUser {
    /// Internal user ID (placeholder until Phase 4 user lookup)
    pub user_id: UserId,
    /// Auth0 subject identifier
    pub auth0_id: String,
    /// User's email address
    pub email: Option<String>,
    /// Whether email is verified
    pub email_verified: bool,
    /// User's display name
    pub name: Option<String>,
    /// User's roles from Auth0
    pub roles: Vec<String>,
}

impl CurrentUser {
    /// Create CurrentUser from validated JWT claims.
    fn from_claims(claims: Claims) -> Self {
        Self {
            // Placeholder - real user lookup will be added in Phase 4
            user_id: UserId::new(),
            auth0_id: claims.sub,
            email: claims.email,
            email_verified: claims.email_verified.unwrap_or(false),
            name: claims.name,
            roles: claims.roles.unwrap_or_default(),
        }
    }

    /// Check if user has a specific role.
    #[must_use]
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }

    /// Check if user has any of the specified roles.
    #[must_use]
    pub fn has_any_role(&self, roles: &[&str]) -> bool {
        roles.iter().any(|r| self.has_role(r))
    }
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Get AuthState from request extensions
        let auth_state = parts
            .extensions
            .get::<AuthState>()
            .ok_or(ApiError::Internal(anyhow::anyhow!(
                "AuthState not configured"
            )))?
            .clone();

        // Get cookies from request
        let jar = CookieJar::from_headers(&parts.headers);

        // Get access token from cookie
        let token = jar
            .get(ACCESS_TOKEN_COOKIE)
            .map(|c| c.value().to_string())
            .ok_or(ApiError::Unauthorized)?;

        // Validate JWT and extract claims
        let claims = validate_jwt(&token, &auth_state.jwks_cache, &auth_state.auth0_config)
            .await
            .map_err(|e| {
                tracing::debug!(error = %e, "JWT validation failed");
                ApiError::Unauthorized
            })?;

        Ok(CurrentUser::from_claims(claims))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_claims() -> Claims {
        Claims {
            sub: "auth0|123".to_string(),
            iss: "https://test.auth0.com/".to_string(),
            aud: glyph_auth::Audience::Single("api://glyph".to_string()),
            exp: 9999999999,
            iat: 0,
            email: Some("user@example.com".to_string()),
            email_verified: Some(true),
            name: Some("Test User".to_string()),
            picture: None,
            roles: Some(vec!["annotator".to_string(), "admin".to_string()]),
        }
    }

    #[test]
    fn from_claims_extracts_fields() {
        let user = CurrentUser::from_claims(test_claims());
        assert_eq!(user.auth0_id, "auth0|123");
        assert_eq!(user.email, Some("user@example.com".to_string()));
        assert!(user.email_verified);
        assert_eq!(user.name, Some("Test User".to_string()));
        assert_eq!(user.roles, vec!["annotator", "admin"]);
    }

    #[test]
    fn has_role_checks_correctly() {
        let user = CurrentUser::from_claims(test_claims());
        assert!(user.has_role("annotator"));
        assert!(user.has_role("admin"));
        assert!(!user.has_role("superuser"));
    }

    #[test]
    fn has_any_role_checks_correctly() {
        let user = CurrentUser::from_claims(test_claims());
        assert!(user.has_any_role(&["annotator", "reviewer"]));
        assert!(user.has_any_role(&["superuser", "admin"]));
        assert!(!user.has_any_role(&["superuser", "reviewer"]));
    }
}
