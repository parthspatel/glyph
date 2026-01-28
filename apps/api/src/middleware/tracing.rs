//! Request tracing middleware

use axum::{extract::Request, middleware::Next, response::Response};
use uuid::Uuid;

/// Add request ID to all requests
pub async fn request_id_middleware(mut request: Request, next: Next) -> Response {
    let request_id = Uuid::new_v4();
    request.extensions_mut().insert(request_id);
    next.run(request).await
}
