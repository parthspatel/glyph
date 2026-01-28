//! Task endpoints

use axum::{extract::Path, routing::get, Json, Router};
use uuid::Uuid;

use crate::ApiError;

async fn get_task(Path(task_id): Path<Uuid>) -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder - will be implemented with actual database access
    Ok(Json(serde_json::json!({
        "task_id": task_id,
        "status": "pending"
    })))
}

async fn list_tasks() -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "tasks": [],
        "total": 0
    })))
}

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_tasks))
        .route("/{task_id}", get(get_task))
}
