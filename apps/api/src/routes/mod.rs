//! API route definitions

mod annotations;
pub mod auth;
mod health;
mod projects;
mod tasks;
mod users;
mod workflows;

use axum::Router;

pub use auth::AuthState;

/// Build the API router with all routes
pub fn api_routes() -> Router {
    Router::new()
        .merge(health::routes())
        .nest("/api/v1", api_v1_routes())
}

/// API v1 routes
fn api_v1_routes() -> Router {
    Router::new()
        .nest("/users", users::routes())
        .nest("/tasks", tasks::routes())
        .nest("/annotations", annotations::routes())
        .nest("/projects", projects::routes())
        .nest("/workflows", workflows::routes())
}

/// Build auth router with state
pub fn auth_routes(state: AuthState) -> Router<()> {
    auth::routes().with_state(state)
}

/// Get all route paths for OpenAPI documentation
pub fn openapi_paths() -> utoipa::openapi::Paths {
    use utoipa::OpenApi;

    // Collect paths from all route modules
    #[derive(OpenApi)]
    #[openapi(paths(users::list_users, users::get_user, users::create_user,))]
    struct UserPaths;

    UserPaths::openapi().paths
}
