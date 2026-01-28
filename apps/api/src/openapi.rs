//! OpenAPI specification generation
//!
//! Configures the OpenAPI document for the Glyph API.

use utoipa::OpenApi;

/// API documentation configuration
#[derive(OpenApi)]
#[openapi(
    info(
        title = "Glyph API",
        version = "1.0.0",
        description = "Data annotation platform API for managing projects, tasks, and annotations.",
        contact(
            name = "Glyph Team",
            url = "https://github.com/parthpatel/glyph"
        ),
        license(
            name = "MIT",
            url = "https://opensource.org/licenses/MIT"
        )
    ),
    servers(
        (url = "/api/v1", description = "API v1")
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "users", description = "User management"),
        (name = "teams", description = "Team management"),
        (name = "projects", description = "Project management"),
        (name = "tasks", description = "Task management"),
        (name = "annotations", description = "Annotation management"),
        (name = "workflows", description = "Workflow management")
    )
)]
pub struct ApiDoc;
