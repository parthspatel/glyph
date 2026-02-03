//! Glyph API - HTTP handlers and routing
//!
//! This crate provides the Axum-based HTTP API for Glyph:
//! - RESTful endpoints for all resources
//! - WebSocket support for real-time updates
//! - Authentication and authorization middleware
//! - OpenAPI documentation with Swagger UI

pub mod error;
pub mod extractors;
pub mod middleware;
pub mod openapi;
pub mod routes;
pub mod services;
pub mod ws;

pub use error::ApiError;
pub use openapi::ApiDoc;
pub use ws::QueueUpdateHub;
