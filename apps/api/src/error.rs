//! API error handling with RFC 7807 Problem Details
//!
//! All API errors are returned in the standard Problem Details format
//! for HTTP APIs (RFC 7807/9457), providing consistent error structure.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use problem_details::ProblemDetails;
use thiserror::Error;

/// Base API error type with RFC 7807 support
#[derive(Debug, Error)]
pub enum ApiError {
    #[error("resource not found: {resource_type} {id}")]
    NotFound {
        resource_type: &'static str,
        id: String,
    },

    #[error("bad request: {message}")]
    BadRequest { code: &'static str, message: String },

    #[error("unauthorized")]
    Unauthorized,

    #[error("forbidden: requires {permission}")]
    Forbidden { permission: String },

    #[error("conflict: {message}")]
    Conflict { code: &'static str, message: String },

    #[error("internal server error")]
    Internal(#[source] anyhow::Error),
}

impl ApiError {
    /// Get the hierarchical error code for this error
    fn error_code(&self) -> &'static str {
        match self {
            Self::NotFound { resource_type, .. } => match *resource_type {
                "user" => "user.not_found",
                "project" => "project.not_found",
                "task" => "task.not_found",
                "annotation" => "annotation.not_found",
                "workflow" => "workflow.not_found",
                "team" => "team.not_found",
                _ => "resource.not_found",
            },
            Self::BadRequest { code, .. } => code,
            Self::Unauthorized => "auth.unauthorized",
            Self::Forbidden { .. } => "auth.forbidden",
            Self::Conflict { code, .. } => code,
            Self::Internal(_) => "internal",
        }
    }

    /// Get the human-readable title for this error
    fn title(&self) -> &'static str {
        match self {
            Self::NotFound { .. } => "Resource Not Found",
            Self::BadRequest { .. } => "Bad Request",
            Self::Unauthorized => "Unauthorized",
            Self::Forbidden { .. } => "Forbidden",
            Self::Conflict { .. } => "Conflict",
            Self::Internal(_) => "Internal Server Error",
        }
    }

    /// Create a not found error for a specific resource
    pub fn not_found(resource_type: &'static str, id: impl Into<String>) -> Self {
        Self::NotFound {
            resource_type,
            id: id.into(),
        }
    }

    /// Create a bad request error with code and message
    pub fn bad_request(code: &'static str, message: impl Into<String>) -> Self {
        Self::BadRequest {
            code,
            message: message.into(),
        }
    }

    /// Create a conflict error with code and message
    pub fn conflict(code: &'static str, message: impl Into<String>) -> Self {
        Self::Conflict {
            code,
            message: message.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match &self {
            ApiError::NotFound { .. } => StatusCode::NOT_FOUND,
            ApiError::BadRequest { .. } => StatusCode::BAD_REQUEST,
            ApiError::Unauthorized => StatusCode::UNAUTHORIZED,
            ApiError::Forbidden { .. } => StatusCode::FORBIDDEN,
            ApiError::Conflict { .. } => StatusCode::CONFLICT,
            ApiError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        let error_code = self.error_code();
        let type_uri = format!("https://api.glyph.app/errors/{error_code}");

        // Build RFC 7807 Problem Details response
        ProblemDetails::from_status_code(status)
            .with_type(http::Uri::try_from(type_uri.as_str()).unwrap_or_default())
            .with_title(self.title())
            .with_detail(self.to_string())
            .into_response()
    }
}

// Conversion from domain errors
impl From<glyph_domain::IdParseError> for ApiError {
    fn from(err: glyph_domain::IdParseError) -> Self {
        ApiError::BadRequest {
            code: "id.parse_error",
            message: err.to_string(),
        }
    }
}

// Conversion from anyhow errors
impl From<anyhow::Error> for ApiError {
    fn from(err: anyhow::Error) -> Self {
        ApiError::Internal(err)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_not_found_error_code() {
        let err = ApiError::not_found("user", "user_123");
        assert_eq!(err.error_code(), "user.not_found");
    }

    #[test]
    fn test_bad_request_error_code() {
        let err = ApiError::bad_request("validation.email", "Invalid email format");
        assert_eq!(err.error_code(), "validation.email");
    }

    #[test]
    fn test_id_parse_error_conversion() {
        let id_err = glyph_domain::IdParseError::MissingPrefix;
        let api_err: ApiError = id_err.into();
        assert_eq!(api_err.error_code(), "id.parse_error");
    }
}
