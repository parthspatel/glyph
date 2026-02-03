//! Workflow endpoints
//!
//! Provides endpoints for workflow management and task workflow operations.

use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::ApiError;

// =============================================================================
// Request/Response Types
// =============================================================================

/// Request to create a workflow from YAML
#[derive(Debug, Deserialize)]
pub struct CreateWorkflowRequest {
    /// YAML workflow definition
    pub yaml: String,
}

/// Response after creating a workflow
#[derive(Debug, Serialize)]
pub struct WorkflowResponse {
    /// Workflow configuration ID
    pub id: Uuid,
    /// Workflow name
    pub name: String,
    /// Workflow version
    pub version: String,
    /// Number of steps
    pub step_count: usize,
}

/// Request to start a workflow for a task
#[derive(Debug, Deserialize)]
pub struct StartTaskWorkflowRequest {
    /// Workflow configuration ID to use
    pub workflow_id: Uuid,
}

/// Request to submit an annotation
#[derive(Debug, Deserialize)]
pub struct SubmitAnnotationRequest {
    /// Current step ID
    pub step_id: String,
    /// Workflow configuration ID
    pub workflow_id: Uuid,
    /// Annotation data
    pub data: serde_json::Value,
}

/// Response for task workflow state
#[derive(Debug, Serialize)]
pub struct TaskWorkflowStateResponse {
    /// Current step ID (None if complete)
    pub current_step: Option<String>,
    /// Whether workflow is complete
    pub is_complete: bool,
    /// Step states
    pub steps: serde_json::Value,
}

/// Response for process result
#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum ProcessResultResponse {
    /// Waiting for more input
    Waiting { step_id: String, reason: String },
    /// Advanced to next step
    Advanced { from_step: String, to_step: String },
    /// Workflow completed
    Completed { output: serde_json::Value },
    /// Failed
    Failed { error: String, recoverable: bool },
}

// =============================================================================
// Handlers
// =============================================================================

/// Get a workflow configuration by ID
async fn get_workflow(Path(workflow_id): Path<Uuid>) -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder - will be wired to orchestrator when AppState includes it
    Ok(Json(serde_json::json!({
        "id": workflow_id,
        "name": "placeholder",
        "version": "1.0",
        "step_count": 0,
        "message": "Workflow retrieval requires AppState with WorkflowOrchestrator"
    })))
}

/// List all workflows
async fn list_workflows() -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder - will be wired to orchestrator when AppState includes it
    Ok(Json(serde_json::json!({
        "workflows": [],
        "total": 0,
        "message": "Workflow listing requires AppState with WorkflowOrchestrator"
    })))
}

/// Create a new workflow from YAML
async fn create_workflow(
    Json(request): Json<CreateWorkflowRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder - actual implementation requires AppState with orchestrator
    // This demonstrates the API contract
    Ok(Json(serde_json::json!({
        "id": Uuid::new_v4(),
        "yaml_length": request.yaml.len(),
        "message": "Workflow creation requires AppState with WorkflowOrchestrator"
    })))
}

/// Start a workflow for a task
async fn start_task_workflow(
    Path(task_id): Path<Uuid>,
    Json(request): Json<StartTaskWorkflowRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "task_id": task_id,
        "workflow_id": request.workflow_id,
        "current_step": "entry",
        "message": "Task workflow start requires AppState with WorkflowOrchestrator"
    })))
}

/// Submit an annotation for the current step
async fn submit_annotation(
    Path(task_id): Path<Uuid>,
    Json(request): Json<SubmitAnnotationRequest>,
) -> Result<Json<ProcessResultResponse>, ApiError> {
    // Placeholder
    Ok(Json(ProcessResultResponse::Waiting {
        step_id: request.step_id,
        reason: format!(
            "Annotation submission for task {} requires AppState with WorkflowOrchestrator",
            task_id
        ),
    }))
}

/// Get task workflow state
async fn get_task_workflow_state(
    Path(task_id): Path<Uuid>,
) -> Result<Json<TaskWorkflowStateResponse>, ApiError> {
    // Placeholder
    Ok(Json(TaskWorkflowStateResponse {
        current_step: Some("placeholder".to_string()),
        is_complete: false,
        steps: serde_json::json!({
            "message": format!("Task {} state retrieval requires AppState with WorkflowOrchestrator", task_id)
        }),
    }))
}

/// Advance task workflow (for auto-process steps)
async fn advance_task_workflow(
    Path(task_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Placeholder
    Ok(Json(serde_json::json!({
        "task_id": task_id,
        "next_step": null,
        "message": "Task workflow advance requires AppState with WorkflowOrchestrator"
    })))
}

// =============================================================================
// Router
// =============================================================================

/// Build workflow routes
pub fn routes() -> Router {
    Router::new()
        // Workflow configuration endpoints
        .route("/", get(list_workflows).post(create_workflow))
        .route("/{workflow_id}", get(get_workflow))
        // Task workflow operation endpoints
        .route("/tasks/{task_id}/start", post(start_task_workflow))
        .route("/tasks/{task_id}/submit", post(submit_annotation))
        .route("/tasks/{task_id}/state", get(get_task_workflow_state))
        .route("/tasks/{task_id}/advance", post(advance_task_workflow))
}
