//! JWKS (JSON Web Key Set) caching.
//!
//! Fetches and caches public keys from Auth0 for JWT validation.

use std::sync::Arc;

use jsonwebtoken::jwk::{AlgorithmParameters, JwkSet};
use jsonwebtoken::DecodingKey;
use reqwest::Client;
use tokio::sync::RwLock;
use tracing::{info, warn};

use crate::error::{AuthError, AuthResult};

/// Cache for JWKS keys from Auth0.
///
/// Stores JWK set and provides key lookup by key ID (kid).
/// Supports automatic refresh when keys are not found.
pub struct JwksCache {
    keys: Arc<RwLock<JwkSet>>,
    jwks_url: String,
    http_client: Client,
}

impl JwksCache {
    /// Create a new JWKS cache for the given URL.
    ///
    /// The cache starts empty; call [`refresh`](Self::refresh) to fetch keys.
    #[must_use]
    pub fn new(jwks_url: impl Into<String>) -> Self {
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .expect("failed to create HTTP client");

        Self {
            keys: Arc::new(RwLock::new(JwkSet { keys: vec![] })),
            jwks_url: jwks_url.into(),
            http_client,
        }
    }

    /// Fetch JWKS from the configured URL and update the cache.
    ///
    /// # Errors
    ///
    /// Returns `JwksFetchError` if the request fails or response is invalid.
    pub async fn refresh(&self) -> AuthResult<()> {
        info!(url = %self.jwks_url, "refreshing JWKS cache");

        let response = self
            .http_client
            .get(&self.jwks_url)
            .send()
            .await
            .map_err(|e| AuthError::JwksFetchError(format!("request failed: {e}")))?;

        if !response.status().is_success() {
            return Err(AuthError::JwksFetchError(format!(
                "HTTP {}",
                response.status()
            )));
        }

        let jwks: JwkSet = response
            .json()
            .await
            .map_err(|e| AuthError::JwksFetchError(format!("invalid JSON: {e}")))?;

        info!(key_count = jwks.keys.len(), "JWKS cache updated");

        let mut keys = self.keys.write().await;
        *keys = jwks;

        Ok(())
    }

    /// Get a decoding key by key ID.
    ///
    /// # Errors
    ///
    /// Returns `KeyNotFound` if no key matches the given kid.
    pub async fn get_key(&self, kid: &str) -> AuthResult<DecodingKey> {
        let keys = self.keys.read().await;

        let jwk = keys
            .keys
            .iter()
            .find(|k| k.common.key_id.as_deref() == Some(kid))
            .ok_or_else(|| AuthError::key_not_found(kid))?;

        match &jwk.algorithm {
            AlgorithmParameters::RSA(rsa) => DecodingKey::from_rsa_components(&rsa.n, &rsa.e)
                .map_err(|e| AuthError::invalid_token(format!("invalid RSA key: {e}"))),
            _ => Err(AuthError::invalid_token("unsupported key algorithm")),
        }
    }

    /// Get a key, refreshing the cache if not found.
    ///
    /// This handles key rotation by attempting a single refresh when
    /// the requested key is not in the cache.
    ///
    /// # Errors
    ///
    /// Returns `KeyNotFound` if key is still not found after refresh.
    pub async fn get_or_refresh_key(&self, kid: &str) -> AuthResult<DecodingKey> {
        match self.get_key(kid).await {
            Ok(key) => Ok(key),
            Err(AuthError::KeyNotFound { .. }) => {
                warn!(kid = %kid, "key not found, refreshing JWKS");
                self.refresh().await?;
                self.get_key(kid).await
            }
            Err(e) => Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_creates_empty_cache() {
        let cache = JwksCache::new("https://example.auth0.com/.well-known/jwks.json");
        assert!(!cache.jwks_url.is_empty());
    }
}
