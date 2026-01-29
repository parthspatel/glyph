//! Authentication library for Glyph.
//!
//! Provides JWT handling, Auth0 integration, and session management.
//!
//! # Modules
//!
//! - [`config`]: Auth0 configuration loaded from environment
//! - [`error`]: Comprehensive authentication error types
//!
//! # Example
//!
//! ```ignore
//! use glyph_auth::{Auth0Config, AuthError, AuthResult};
//!
//! let config = Auth0Config::from_env()?;
//! println!("Issuer: {}", config.issuer());
//! ```

pub mod config;
pub mod error;
pub mod jwks;
pub mod jwt;
pub mod oidc;
pub mod tokens;

// Re-exports for convenience
pub use config::{Auth0Config, ConfigError};
pub use error::{AuthError, AuthResult};
pub use jwks::JwksCache;
pub use jwt::{validate_jwt, Audience, Claims};
pub use oidc::{Auth0Client, AuthorizationData, OidcTokenResponse};
pub use tokens::{
    clear_auth_cookies, clear_pkce_cookie, parse_pkce_cookie, set_auth_cookies, set_pkce_cookie,
    ACCESS_TOKEN_COOKIE, PKCE_STATE_COOKIE, REFRESH_TOKEN_COOKIE,
};

// Modules to be added in subsequent plans:
// pub mod audit;   // 03-06: Audit logging
