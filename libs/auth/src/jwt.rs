//! JWT token validation.
//!
//! Validates access tokens against Auth0's public keys.

use jsonwebtoken::{decode, decode_header, Algorithm, Validation};
use serde::{Deserialize, Serialize};

use crate::config::Auth0Config;
use crate::error::{AuthError, AuthResult};
use crate::jwks::JwksCache;

/// JWT claims extracted from a validated token.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// Subject (Auth0 user ID)
    pub sub: String,
    /// Issuer
    pub iss: String,
    /// Audience (can be string or array in JWT)
    pub aud: Audience,
    /// Expiration timestamp (Unix epoch)
    pub exp: i64,
    /// Issued at timestamp (Unix epoch)
    pub iat: i64,
    /// User's email address
    pub email: Option<String>,
    /// Whether email is verified
    pub email_verified: Option<bool>,
    /// User's display name
    pub name: Option<String>,
    /// User's profile picture URL
    pub picture: Option<String>,
    /// Custom roles claim (namespace may vary)
    #[serde(default)]
    #[serde(alias = "https://glyph.app/roles")]
    pub roles: Option<Vec<String>>,
}

/// Audience claim that can be either a single string or array.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Audience {
    Single(String),
    Multiple(Vec<String>),
}

impl Audience {
    /// Check if the audience contains the expected value.
    #[must_use]
    pub fn contains(&self, expected: &str) -> bool {
        match self {
            Self::Single(s) => s == expected,
            Self::Multiple(v) => v.iter().any(|s| s == expected),
        }
    }
}

/// Validate a JWT token against Auth0's public keys.
///
/// Performs the following validations:
/// - RS256 algorithm (explicit, prevents algorithm confusion attacks)
/// - Issuer matches Auth0 domain
/// - Audience matches API identifier
/// - Token not expired (with 60-second leeway for clock skew)
///
/// # Arguments
///
/// * `token` - The JWT access token to validate
/// * `jwks` - JWKS cache for key lookup
/// * `config` - Auth0 configuration for issuer/audience validation
///
/// # Errors
///
/// Returns `AuthError` variants:
/// - `InvalidToken` - Malformed token or invalid signature
/// - `TokenExpired` - Token has expired
/// - `KeyNotFound` - Signing key not in JWKS
pub async fn validate_jwt(
    token: &str,
    jwks: &JwksCache,
    config: &Auth0Config,
) -> AuthResult<Claims> {
    // Decode header to get the key ID
    let header = decode_header(token)
        .map_err(|e| AuthError::invalid_token(format!("invalid header: {e}")))?;

    let kid = header
        .kid
        .ok_or_else(|| AuthError::invalid_token("missing kid in token header"))?;

    // Get decoding key (with auto-refresh on miss)
    let key = jwks.get_or_refresh_key(&kid).await?;

    // Build validation rules
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_issuer(&[config.issuer()]);
    validation.set_audience(&[&config.api_identifier]);
    validation.leeway = 60; // 60-second clock skew tolerance

    // Decode and validate token
    let token_data = decode::<Claims>(token, &key, &validation).map_err(|e| {
        use jsonwebtoken::errors::ErrorKind;
        match e.kind() {
            ErrorKind::ExpiredSignature => AuthError::TokenExpired,
            ErrorKind::InvalidIssuer => {
                AuthError::invalid_token(format!("issuer mismatch: expected {}", config.issuer()))
            }
            ErrorKind::InvalidAudience => AuthError::invalid_token(format!(
                "audience mismatch: expected {}",
                config.api_identifier
            )),
            ErrorKind::InvalidAlgorithm => AuthError::invalid_token("algorithm must be RS256"),
            _ => AuthError::invalid_token(format!("validation failed: {e}")),
        }
    })?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn audience_single_contains() {
        let aud = Audience::Single("api://glyph".to_string());
        assert!(aud.contains("api://glyph"));
        assert!(!aud.contains("other"));
    }

    #[test]
    fn audience_multiple_contains() {
        let aud = Audience::Multiple(vec!["api://glyph".to_string(), "other".to_string()]);
        assert!(aud.contains("api://glyph"));
        assert!(aud.contains("other"));
        assert!(!aud.contains("unknown"));
    }
}
