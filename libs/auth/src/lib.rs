//! Authentication library for Glyph
//!
//! Provides JWT handling, Auth0 integration, and RBAC.

// Placeholder modules - to be implemented in Phase 3
// pub mod jwt;
// pub mod auth0;
// pub mod rbac;

/// Placeholder for JWT token claims
#[derive(Debug, Clone)]
pub struct Claims {
    pub sub: String,
    pub exp: i64,
}

/// Placeholder for authentication result
pub type AuthResult<T> = Result<T, AuthError>;

/// Authentication errors
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Invalid token")]
    InvalidToken,
    #[error("Token expired")]
    TokenExpired,
    #[error("Insufficient permissions")]
    InsufficientPermissions,
}
