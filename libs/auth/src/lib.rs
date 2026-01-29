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

// Re-exports for convenience
pub use config::{Auth0Config, ConfigError};
pub use error::{AuthError, AuthResult};
pub use jwks::JwksCache;
pub use jwt::{validate_jwt, Audience, Claims};

// Modules to be added in subsequent plans:
// pub mod oidc;    // 03-03: OIDC client
// pub mod tokens;  // 03-04: Token cookie helpers
// pub mod audit;   // 03-06: Audit logging
