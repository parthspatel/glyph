//! Auth0 configuration management.
//!
//! Loads Auth0 credentials and settings from environment variables.

use std::env;

/// Configuration error types.
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    /// Required environment variable is missing.
    #[error("missing required environment variable: {name}")]
    MissingEnvVar { name: &'static str },
}

/// Auth0 configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct Auth0Config {
    /// Auth0 tenant domain (e.g., "myapp.us.auth0.com")
    pub domain: String,
    /// OAuth2 client ID
    pub client_id: String,
    /// OAuth2 client secret
    pub client_secret: String,
    /// API identifier (audience) for access tokens
    pub api_identifier: String,
    /// OAuth callback URL
    pub callback_url: String,
    /// URL to redirect after logout
    pub logout_redirect_url: String,
}

impl Auth0Config {
    /// Load configuration from environment variables.
    ///
    /// Required variables:
    /// - `AUTH0_DOMAIN`
    /// - `AUTH0_CLIENT_ID`
    /// - `AUTH0_CLIENT_SECRET`
    /// - `AUTH0_API_IDENTIFIER`
    /// - `AUTH0_CALLBACK_URL`
    /// - `AUTH0_LOGOUT_REDIRECT_URL`
    ///
    /// # Errors
    ///
    /// Returns `ConfigError::MissingEnvVar` if any required variable is missing.
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            domain: get_required_env("AUTH0_DOMAIN")?,
            client_id: get_required_env("AUTH0_CLIENT_ID")?,
            client_secret: get_required_env("AUTH0_CLIENT_SECRET")?,
            api_identifier: get_required_env("AUTH0_API_IDENTIFIER")?,
            callback_url: get_required_env("AUTH0_CALLBACK_URL")?,
            logout_redirect_url: get_required_env("AUTH0_LOGOUT_REDIRECT_URL")?,
        })
    }

    /// Returns the OIDC issuer URL.
    ///
    /// Format: `https://{domain}/`
    #[must_use]
    pub fn issuer(&self) -> String {
        format!("https://{}/", self.domain)
    }

    /// Returns the JWKS (JSON Web Key Set) URL.
    ///
    /// Format: `https://{domain}/.well-known/jwks.json`
    #[must_use]
    pub fn jwks_url(&self) -> String {
        format!("https://{}/.well-known/jwks.json", self.domain)
    }
}

/// Get a required environment variable, returning an error if missing.
fn get_required_env(name: &'static str) -> Result<String, ConfigError> {
    env::var(name).map_err(|_| ConfigError::MissingEnvVar { name })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn issuer_format() {
        let config = Auth0Config {
            domain: "test.auth0.com".to_string(),
            client_id: "client".to_string(),
            client_secret: "secret".to_string(),
            api_identifier: "api".to_string(),
            callback_url: "http://localhost/callback".to_string(),
            logout_redirect_url: "http://localhost".to_string(),
        };
        assert_eq!(config.issuer(), "https://test.auth0.com/");
    }

    #[test]
    fn jwks_url_format() {
        let config = Auth0Config {
            domain: "test.auth0.com".to_string(),
            client_id: "client".to_string(),
            client_secret: "secret".to_string(),
            api_identifier: "api".to_string(),
            callback_url: "http://localhost/callback".to_string(),
            logout_redirect_url: "http://localhost".to_string(),
        };
        assert_eq!(
            config.jwks_url(),
            "https://test.auth0.com/.well-known/jwks.json"
        );
    }
}
