//! API route definitions

mod annotations;
pub mod auth;
mod data_sources;
mod health;
mod project_types;
mod projects;
pub mod queue;
mod skills;
mod tasks;
mod teams;
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
        .nest("/users/{user_id}/skills", skills::user_skill_routes())
        .nest("/skills/types", skills::skill_type_routes())
        .nest("/teams", teams::routes())
        .nest("/tasks", tasks::routes())
        .nest("/queue", queue::routes_without_ws())
        .nest("/annotations", annotations::routes())
        .nest("/projects", projects::routes())
        .nest(
            "/projects/{project_id}/data-sources",
            data_sources::routes(),
        )
        .nest("/projects/{project_id}/tasks", tasks::project_routes())
        .nest("/project-types", project_types::routes())
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
