//! Authentication error types.
//!
//! Comprehensive error variants covering all authentication failure modes.

use crate::config::ConfigError;

/// Authentication result type alias.
pub type AuthResult<T> = Result<T, AuthError>;

/// Authentication errors covering token, JWKS, OIDC, and authorization failures.
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    /// JWT token is malformed or has an invalid signature.
    #[error("invalid token: {reason}")]
    InvalidToken { reason: String },

    /// JWT token has expired (exp claim in the past).
    #[error("token has expired")]
    TokenExpired,

    /// No authentication token provided in request.
    #[error("authentication token missing")]
    MissingToken,

    /// JWKS key not found for the token's key ID.
    #[error("signing key not found: {kid}")]
    KeyNotFound { kid: String },

    /// Failed to fetch JWKS from the identity provider.
    #[error("failed to fetch JWKS: {0}")]
    JwksFetchError(String),

    /// OIDC discovery failed.
    #[error("OIDC discovery failed: {0}")]
    DiscoveryError(String),

    /// Authorization code exchange failed.
    #[error("token exchange failed: {0}")]
    TokenExchangeError(String),

    /// CSRF state parameter mismatch.
    #[error("invalid state parameter (CSRF check failed)")]
    InvalidState,

    /// Nonce mismatch in ID token (replay protection).
    #[error("invalid nonce in ID token")]
    InvalidNonce,

    /// User lacks required permissions for the operation.
    #[error("insufficient permissions")]
    InsufficientPermissions,

    /// Authenticated user not found in database.
    #[error("user not found")]
    UserNotFound,

    /// User account has been deactivated.
    #[error("user account is deactivated")]
    UserDeactivated,

    /// Configuration error (missing or invalid settings).
    #[error("configuration error: {0}")]
    Config(#[from] ConfigError),

    /// Internal/unexpected error.
    #[error("internal authentication error: {0}")]
    Internal(String),
}

impl AuthError {
    /// Create an `InvalidToken` error with the given reason.
    #[must_use]
    pub fn invalid_token(reason: impl Into<String>) -> Self {
        Self::InvalidToken {
            reason: reason.into(),
        }
    }

    /// Create a `KeyNotFound` error for the given key ID.
    #[must_use]
    pub fn key_not_found(kid: impl Into<String>) -> Self {
        Self::KeyNotFound { kid: kid.into() }
    }

    /// Create an internal error with the given message.
    #[must_use]
    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal(message.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_display_messages() {
        assert_eq!(
            AuthError::invalid_token("bad signature").to_string(),
            "invalid token: bad signature"
        );
        assert_eq!(AuthError::TokenExpired.to_string(), "token has expired");
        assert_eq!(
            AuthError::MissingToken.to_string(),
            "authentication token missing"
        );
        assert_eq!(
            AuthError::key_not_found("abc123").to_string(),
            "signing key not found: abc123"
        );
    }

    #[test]
    fn config_error_conversion() {
        let config_err = ConfigError::MissingEnvVar {
            name: "AUTH0_DOMAIN",
        };
        let auth_err: AuthError = config_err.into();
        assert!(matches!(auth_err, AuthError::Config(_)));
    }
}
