//! Project endpoints

use axum::{extract::Path, routing::get, Json, Router};
use uuid::Uuid;

use crate::ApiError;

async fn get_project(Path(project_id): Path<Uuid>) -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "project_id": project_id,
        "status": "active"
    })))
}

async fn list_projects() -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "projects": [],
        "total": 0
    })))
}

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_projects))
        .route("/{project_id}", get(get_project))
}
