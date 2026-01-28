//! Annotation endpoints

use axum::{extract::Path, routing::get, Json, Router};
use uuid::Uuid;

use crate::ApiError;

async fn get_annotation(
    Path(annotation_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "annotation_id": annotation_id,
        "status": "draft"
    })))
}

async fn create_annotation(
    Json(_payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "annotation_id": Uuid::new_v4(),
        "status": "draft"
    })))
}

async fn list_annotations() -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "annotations": [],
        "total": 0
    })))
}

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_annotations).post(create_annotation))
        .route("/{annotation_id}", get(get_annotation))
}
