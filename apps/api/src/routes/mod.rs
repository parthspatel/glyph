//! API route definitions

mod annotations;
mod health;
mod projects;
mod tasks;
mod workflows;

use axum::Router;

/// Build the API router with all routes
pub fn api_routes() -> Router {
    Router::new()
        .merge(health::routes())
        .nest("/api/v1", api_v1_routes())
}

/// API v1 routes
fn api_v1_routes() -> Router {
    Router::new()
        .nest("/tasks", tasks::routes())
        .nest("/annotations", annotations::routes())
        .nest("/projects", projects::routes())
        .nest("/workflows", workflows::routes())
}
