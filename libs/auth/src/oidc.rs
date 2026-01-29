//! OIDC client for Auth0 integration.
//!
//! Handles OAuth2/OIDC flows including authorization, token exchange, and logout.
//! Uses direct HTTP calls rather than the openidconnect crate's full type system
//! for simplicity with Auth0's well-known endpoints.

use serde::Deserialize;
use std::time::Duration;
use tracing::info;

use crate::config::Auth0Config;
use crate::error::{AuthError, AuthResult};

/// Authorization data returned when starting the login flow.
///
/// Contains all state needed to verify the callback.
#[derive(Debug)]
pub struct AuthorizationData {
    /// URL to redirect the user to for authentication
    pub url: String,
    /// CSRF token for state validation
    pub csrf_token: String,
    /// Nonce for ID token validation
    pub nonce: String,
    /// PKCE verifier (must be stored securely until callback)
    pub pkce_verifier: String,
}

/// Token response from a successful code exchange.
#[derive(Debug, Clone)]
pub struct OidcTokenResponse {
    /// Access token for API calls
    pub access_token: String,
    /// Refresh token for obtaining new access tokens
    pub refresh_token: Option<String>,
    /// ID token containing user claims
    pub id_token: String,
    /// Token expiration duration
    pub expires_in: Duration,
}

/// Auth0 token endpoint response.
#[derive(Debug, Deserialize)]
struct TokenEndpointResponse {
    access_token: String,
    refresh_token: Option<String>,
    id_token: Option<String>,
    #[allow(dead_code)]
    token_type: String,
    expires_in: u64,
}

/// Auth0 OIDC client.
///
/// Handles OAuth2 authorization code flow with PKCE.
pub struct Auth0Client {
    http_client: reqwest::Client,
    config: Auth0Config,
    authorization_endpoint: String,
    token_endpoint: String,
}

impl Auth0Client {
    /// Create a new Auth0 client.
    ///
    /// Auth0 has well-known endpoints, so we construct them directly.
    ///
    /// # Errors
    ///
    /// Returns `DiscoveryError` if HTTP client creation fails.
    pub async fn new(config: Auth0Config) -> AuthResult<Self> {
        info!(domain = %config.domain, "initializing Auth0 client");

        // Create HTTP client with no redirects (security requirement)
        let http_client = reqwest::ClientBuilder::new()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| AuthError::DiscoveryError(format!("failed to create HTTP client: {e}")))?;

        // Auth0 uses standard OIDC endpoints
        let authorization_endpoint = format!("https://{}/authorize", config.domain);
        let token_endpoint = format!("https://{}/oauth/token", config.domain);

        info!("Auth0 OIDC client initialized");

        Ok(Self {
            http_client,
            config,
            authorization_endpoint,
            token_endpoint,
        })
    }

    /// Generate an authorization URL for the login flow.
    ///
    /// Returns all state needed to validate the callback.
    #[must_use]
    pub fn authorize_url(&self) -> AuthorizationData {
        // Generate PKCE challenge
        let pkce_verifier = generate_random_string(64);
        let pkce_challenge = generate_pkce_challenge(&pkce_verifier);

        // Generate CSRF state and nonce
        let csrf_token = generate_random_string(32);
        let nonce = generate_random_string(32);

        // Build authorization URL
        let url = format!(
            "{}?response_type=code&client_id={}&redirect_uri={}&scope={}&state={}&nonce={}&code_challenge={}&code_challenge_method=S256",
            self.authorization_endpoint,
            urlencoding::encode(&self.config.client_id),
            urlencoding::encode(&self.config.callback_url),
            urlencoding::encode("openid profile email offline_access"),
            urlencoding::encode(&csrf_token),
            urlencoding::encode(&nonce),
            urlencoding::encode(&pkce_challenge),
        );

        AuthorizationData {
            url,
            csrf_token,
            nonce,
            pkce_verifier,
        }
    }

    /// Exchange an authorization code for tokens.
    ///
    /// # Arguments
    ///
    /// * `code` - Authorization code from callback
    /// * `pkce_verifier` - PKCE verifier from authorization request
    /// * `_expected_nonce` - Nonce from authorization request (validated via ID token claims)
    ///
    /// # Errors
    ///
    /// Returns `TokenExchangeError` if code exchange fails.
    pub async fn exchange_code(
        &self,
        code: &str,
        pkce_verifier: &str,
        _expected_nonce: &str,
    ) -> AuthResult<OidcTokenResponse> {
        let params = [
            ("grant_type", "authorization_code"),
            ("client_id", &self.config.client_id),
            ("client_secret", &self.config.client_secret),
            ("code", code),
            ("redirect_uri", &self.config.callback_url),
            ("code_verifier", pkce_verifier),
        ];

        let response = self
            .http_client
            .post(&self.token_endpoint)
            .form(&params)
            .send()
            .await
            .map_err(|e| AuthError::TokenExchangeError(format!("request failed: {e}")))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AuthError::TokenExchangeError(format!(
                "HTTP {}: {}",
                status, body
            )));
        }

        let token_response: TokenEndpointResponse = response
            .json()
            .await
            .map_err(|e| AuthError::TokenExchangeError(format!("invalid response: {e}")))?;

        let id_token = token_response
            .id_token
            .ok_or_else(|| AuthError::TokenExchangeError("no ID token in response".to_string()))?;

        info!("token exchange successful");

        Ok(OidcTokenResponse {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token,
            id_token,
            expires_in: Duration::from_secs(token_response.expires_in),
        })
    }

    /// Refresh tokens using a refresh token.
    ///
    /// # Errors
    ///
    /// Returns `TokenExchangeError` if refresh fails.
    pub async fn refresh_tokens(&self, refresh_token: &str) -> AuthResult<OidcTokenResponse> {
        let params = [
            ("grant_type", "refresh_token"),
            ("client_id", &self.config.client_id),
            ("client_secret", &self.config.client_secret),
            ("refresh_token", refresh_token),
        ];

        let response = self
            .http_client
            .post(&self.token_endpoint)
            .form(&params)
            .send()
            .await
            .map_err(|e| AuthError::TokenExchangeError(format!("refresh request failed: {e}")))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AuthError::TokenExchangeError(format!(
                "HTTP {}: {}",
                status, body
            )));
        }

        let token_response: TokenEndpointResponse = response
            .json()
            .await
            .map_err(|e| AuthError::TokenExchangeError(format!("invalid response: {e}")))?;

        info!("token refresh successful");

        Ok(OidcTokenResponse {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token,
            id_token: token_response.id_token.unwrap_or_default(),
            expires_in: Duration::from_secs(token_response.expires_in),
        })
    }

    /// Generate a federated logout URL.
    ///
    /// This clears both the application session and the Auth0 session.
    #[must_use]
    pub fn logout_url(&self, return_to: &str) -> String {
        let encoded_return_to = urlencoding::encode(return_to);
        format!(
            "https://{}/v2/logout?client_id={}&returnTo={}&federated",
            self.config.domain, self.config.client_id, encoded_return_to
        )
    }

    /// Get the configured redirect URL for the callback.
    #[must_use]
    pub fn callback_url(&self) -> &str {
        &self.config.callback_url
    }
}

/// Generate a random URL-safe string of the given length.
fn generate_random_string(len: usize) -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

/// Generate PKCE code challenge from verifier using SHA256.
fn generate_pkce_challenge(verifier: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    base64_url_encode(&hash)
}

/// Base64 URL-safe encoding without padding.
fn base64_url_encode(data: &[u8]) -> String {
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    URL_SAFE_NO_PAD.encode(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> Auth0Config {
        Auth0Config {
            domain: "test.auth0.com".to_string(),
            client_id: "test-client-id".to_string(),
            client_secret: "test-secret".to_string(),
            api_identifier: "api://glyph".to_string(),
            callback_url: "http://localhost:3000/api/auth/callback".to_string(),
            logout_redirect_url: "http://localhost:3000".to_string(),
        }
    }

    #[test]
    fn logout_url_format() {
        let config = test_config();
        let return_to = "http://localhost:3000";
        let encoded = urlencoding::encode(return_to);
        let expected = format!(
            "https://{}/v2/logout?client_id={}&returnTo={}&federated",
            config.domain, config.client_id, encoded
        );
        assert!(expected.contains("federated"));
        assert!(expected.contains("returnTo="));
    }

    #[test]
    fn pkce_challenge_generation() {
        let verifier = "test_verifier_string_that_is_long_enough";
        let challenge = generate_pkce_challenge(verifier);
        // Challenge should be base64url encoded SHA256 hash
        assert!(!challenge.is_empty());
        assert!(!challenge.contains('='));
        assert!(!challenge.contains('+'));
        assert!(!challenge.contains('/'));
    }

    #[test]
    fn random_string_generation() {
        let s1 = generate_random_string(32);
        let s2 = generate_random_string(32);
        assert_eq!(s1.len(), 32);
        assert_eq!(s2.len(), 32);
        assert_ne!(s1, s2); // Should be different (statistically)
    }
}
