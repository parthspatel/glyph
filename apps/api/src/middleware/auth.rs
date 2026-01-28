//! Authentication middleware

use axum::{extract::Request, middleware::Next, response::Response};

use crate::ApiError;

/// Authentication middleware
pub async fn auth_middleware(request: Request, next: Next) -> Result<Response, ApiError> {
    // Placeholder - will implement actual auth logic
    // For now, just pass through
    Ok(next.run(request).await)
}
