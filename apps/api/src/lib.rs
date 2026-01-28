//! Glyph API - HTTP handlers and routing
//!
//! This crate provides the Axum-based HTTP API for Glyph:
//! - RESTful endpoints for all resources
//! - WebSocket support for real-time updates
//! - Authentication and authorization middleware

pub mod error;
pub mod extractors;
pub mod middleware;
pub mod routes;

pub use error::ApiError;
