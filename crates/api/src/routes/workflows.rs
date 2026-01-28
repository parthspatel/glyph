//! Workflow endpoints

use axum::{extract::Path, routing::get, Json, Router};
use uuid::Uuid;

use crate::ApiError;

async fn get_workflow(Path(workflow_id): Path<Uuid>) -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "workflow_id": workflow_id,
        "type": "single"
    })))
}

async fn list_workflows() -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "workflows": [],
        "total": 0
    })))
}

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_workflows))
        .route("/{workflow_id}", get(get_workflow))
}
