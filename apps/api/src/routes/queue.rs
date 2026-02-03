//! Queue API endpoints for annotator task management
//!
//! Provides endpoints for viewing assigned tasks, queue statistics,
//! and user presence on projects.

use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::extractors::CurrentUser;
use crate::ws::{ClientMessage, QueueEvent, QueueUpdateHub};
use crate::ApiError;

// =============================================================================
// Request/Response Types
// =============================================================================

/// A single item in the user's queue
#[derive(Debug, Serialize, ToSchema)]
pub struct QueueItem {
    pub assignment_id: Uuid,
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub project_name: String,
    pub step_id: String,
    pub step_type: String,
    pub status: String,
    pub priority: i32,
    pub assigned_at: DateTime<Utc>,
    pub time_in_queue_seconds: i64,
    pub estimated_duration_minutes: Option<i32>,
    pub input_data_preview: Option<serde_json::Value>,
}

/// Filters for queue listing
#[derive(Debug, Deserialize, Default)]
pub struct QueueFilters {
    pub project_id: Option<Uuid>,
    pub step_type: Option<String>,
    pub status: Option<String>,
}

/// Sort options for queue listing
#[derive(Debug, Deserialize, Default)]
pub struct QueueSort {
    /// Sort field: priority, age, project
    pub by: Option<String>,
    /// Sort order: asc, desc
    pub order: Option<String>,
}

/// Combined query parameters for queue listing
#[derive(Debug, Deserialize, Default)]
pub struct QueueQuery {
    #[serde(flatten)]
    pub filters: QueueFilters,
    #[serde(flatten)]
    pub sort: QueueSort,
    pub page: Option<i32>,
    pub per_page: Option<i32>,
}

/// Queue statistics per project
#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectQueueStats {
    pub project_id: Uuid,
    pub project_name: String,
    pub pending: i64,
    pub in_progress: i64,
}

/// Overall queue statistics
#[derive(Debug, Serialize, ToSchema)]
pub struct QueueStats {
    pub total_pending: i64,
    pub total_in_progress: i64,
    pub by_project: Vec<ProjectQueueStats>,
}

/// Queue list response
#[derive(Debug, Serialize, ToSchema)]
pub struct QueueListResponse {
    pub items: Vec<QueueItem>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub total_pages: i32,
}

/// User presence information
#[derive(Debug, Serialize, ToSchema)]
pub struct UserPresence {
    pub user_id: Uuid,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub last_seen_at: DateTime<Utc>,
}

/// Presence list response
#[derive(Debug, Serialize, ToSchema)]
pub struct PresenceResponse {
    pub project_id: Uuid,
    pub active_users: Vec<UserPresence>,
}

// =============================================================================
// Database Row Types
// =============================================================================

#[derive(sqlx::FromRow)]
struct QueueRow {
    assignment_id: Uuid,
    task_id: Uuid,
    project_id: Uuid,
    project_name: String,
    step_id: String,
    step_type: Option<String>,
    status: String,
    priority: i32,
    assigned_at: DateTime<Utc>,
    time_in_queue_seconds: Option<i64>,
}

#[derive(sqlx::FromRow)]
struct StatsRow {
    project_id: Uuid,
    project_name: String,
    pending: i64,
    in_progress: i64,
}

#[derive(sqlx::FromRow)]
struct PresenceRow {
    user_id: Uuid,
    display_name: String,
    avatar_url: Option<String>,
    last_seen_at: DateTime<Utc>,
}

// =============================================================================
// Route Handlers
// =============================================================================

/// Get current user's task queue
#[utoipa::path(
    get,
    path = "/api/v1/queue",
    params(
        ("project_id" = Option<Uuid>, Query, description = "Filter by project"),
        ("step_type" = Option<String>, Query, description = "Filter by step type"),
        ("status" = Option<String>, Query, description = "Filter by status"),
        ("by" = Option<String>, Query, description = "Sort by: priority, age, project"),
        ("order" = Option<String>, Query, description = "Sort order: asc, desc"),
        ("page" = Option<i32>, Query, description = "Page number"),
        ("per_page" = Option<i32>, Query, description = "Items per page"),
    ),
    responses(
        (status = 200, description = "Queue items", body = QueueListResponse),
        (status = 401, description = "Unauthorized"),
    ),
    tag = "queue"
)]
async fn get_queue(
    current_user: CurrentUser,
    Query(query): Query<QueueQuery>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<QueueListResponse>, ApiError> {
    let user_id = current_user.user_id;
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = ((page - 1) * per_page) as i64;
    let limit = per_page as i64;

    // Build dynamic sort clause
    let order_by = match (query.sort.by.as_deref(), query.sort.order.as_deref()) {
        (Some("age"), Some("asc")) => "ta.assigned_at ASC",
        (Some("age"), _) => "ta.assigned_at DESC",
        (Some("project"), Some("desc")) => "p.name DESC, t.priority DESC",
        (Some("project"), _) => "p.name ASC, t.priority DESC",
        _ => "t.priority DESC, ta.assigned_at ASC", // default: priority
    };

    // Build WHERE clauses for filters
    let mut conditions = vec![
        "ta.user_id = $1",
        "ta.status IN ('assigned', 'accepted', 'in_progress')",
    ];

    let project_filter = query.filters.project_id;
    let step_filter = query.filters.step_type.clone();
    let status_filter = query.filters.status.clone();

    if project_filter.is_some() {
        conditions.push("ta.project_id = $4");
    }
    if step_filter.is_some() {
        conditions.push("ta.step_id = $5");
    }
    if let Some(ref s) = status_filter {
        if !s.is_empty() {
            conditions.push("ta.status = $6::assignment_status");
        }
    }

    let where_clause = conditions.join(" AND ");

    // Query with dynamic ordering (using format! for ORDER BY since it can't be parameterized)
    let query_str = format!(
        r#"
        SELECT
            ta.assignment_id,
            ta.task_id,
            ta.project_id,
            p.name as project_name,
            ta.step_id,
            ta.step_id as step_type,
            ta.status::text,
            t.priority,
            ta.assigned_at,
            EXTRACT(EPOCH FROM (NOW() - ta.assigned_at))::bigint as time_in_queue_seconds
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.task_id
        JOIN projects p ON ta.project_id = p.project_id
        WHERE {}
        ORDER BY {}
        LIMIT $2 OFFSET $3
        "#,
        where_clause, order_by
    );

    // Execute query with conditional bindings
    let rows: Vec<QueueRow> = if let Some(proj_id) = project_filter {
        if let Some(ref step) = step_filter {
            if let Some(ref status) = status_filter {
                sqlx::query_as(&query_str)
                    .bind(user_id.as_uuid())
                    .bind(limit)
                    .bind(offset)
                    .bind(proj_id)
                    .bind(step)
                    .bind(status)
                    .fetch_all(&pool)
                    .await
            } else {
                sqlx::query_as(&query_str)
                    .bind(user_id.as_uuid())
                    .bind(limit)
                    .bind(offset)
                    .bind(proj_id)
                    .bind(step)
                    .fetch_all(&pool)
                    .await
            }
        } else if let Some(ref status) = status_filter {
            // Adjust query for missing step filter
            let adjusted_query = query_str
                .replace("$5", "$6")
                .replace("$6::assignment_status", "$5::assignment_status");
            sqlx::query_as(&adjusted_query)
                .bind(user_id.as_uuid())
                .bind(limit)
                .bind(offset)
                .bind(proj_id)
                .bind(status)
                .fetch_all(&pool)
                .await
        } else {
            sqlx::query_as(&query_str)
                .bind(user_id.as_uuid())
                .bind(limit)
                .bind(offset)
                .bind(proj_id)
                .fetch_all(&pool)
                .await
        }
    } else {
        // No project filter - simpler query
        let simple_query = format!(
            r#"
            SELECT
                ta.assignment_id,
                ta.task_id,
                ta.project_id,
                p.name as project_name,
                ta.step_id,
                ta.step_id as step_type,
                ta.status::text,
                t.priority,
                ta.assigned_at,
                EXTRACT(EPOCH FROM (NOW() - ta.assigned_at))::bigint as time_in_queue_seconds
            FROM task_assignments ta
            JOIN tasks t ON ta.task_id = t.task_id
            JOIN projects p ON ta.project_id = p.project_id
            WHERE ta.user_id = $1 AND ta.status IN ('assigned', 'accepted', 'in_progress')
            ORDER BY {}
            LIMIT $2 OFFSET $3
            "#,
            order_by
        );
        sqlx::query_as(&simple_query)
            .bind(user_id.as_uuid())
            .bind(limit)
            .bind(offset)
            .fetch_all(&pool)
            .await
    }
    .map_err(|e| ApiError::Internal(e.into()))?;

    // Get total count
    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM task_assignments
        WHERE user_id = $1 AND status IN ('assigned', 'accepted', 'in_progress')
        "#,
    )
    .bind(user_id.as_uuid())
    .fetch_one(&pool)
    .await
    .map_err(|e| ApiError::Internal(e.into()))?;

    let items: Vec<QueueItem> = rows
        .into_iter()
        .map(|r| QueueItem {
            assignment_id: r.assignment_id,
            task_id: r.task_id,
            project_id: r.project_id,
            project_name: r.project_name,
            step_id: r.step_id,
            step_type: r.step_type.unwrap_or_else(|| "annotation".to_string()),
            status: r.status,
            priority: r.priority,
            assigned_at: r.assigned_at,
            time_in_queue_seconds: r.time_in_queue_seconds.unwrap_or(0),
            estimated_duration_minutes: None,
            input_data_preview: None,
        })
        .collect();

    let total_pages = ((total as f64) / (per_page as f64)).ceil() as i32;

    Ok(Json(QueueListResponse {
        items,
        total,
        page,
        per_page,
        total_pages,
    }))
}

/// Get queue statistics for current user
#[utoipa::path(
    get,
    path = "/api/v1/queue/stats",
    responses(
        (status = 200, description = "Queue statistics", body = QueueStats),
        (status = 401, description = "Unauthorized"),
    ),
    tag = "queue"
)]
async fn get_queue_stats(
    current_user: CurrentUser,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<QueueStats>, ApiError> {
    let user_id = current_user.user_id;

    let rows: Vec<StatsRow> = sqlx::query_as(
        r#"
        SELECT
            ta.project_id,
            p.name as project_name,
            COUNT(*) FILTER (WHERE ta.status = 'assigned') as pending,
            COUNT(*) FILTER (WHERE ta.status IN ('accepted', 'in_progress')) as in_progress
        FROM task_assignments ta
        JOIN projects p ON ta.project_id = p.project_id
        WHERE ta.user_id = $1 AND ta.status IN ('assigned', 'accepted', 'in_progress')
        GROUP BY ta.project_id, p.name
        "#,
    )
    .bind(user_id.as_uuid())
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError::Internal(e.into()))?;

    let total_pending: i64 = rows.iter().map(|r| r.pending).sum();
    let total_in_progress: i64 = rows.iter().map(|r| r.in_progress).sum();

    let by_project: Vec<ProjectQueueStats> = rows
        .into_iter()
        .map(|r| ProjectQueueStats {
            project_id: r.project_id,
            project_name: r.project_name,
            pending: r.pending,
            in_progress: r.in_progress,
        })
        .collect();

    Ok(Json(QueueStats {
        total_pending,
        total_in_progress,
        by_project,
    }))
}

/// Get active users on a project
#[utoipa::path(
    get,
    path = "/api/v1/queue/presence/{project_id}",
    params(
        ("project_id" = Uuid, Path, description = "Project ID"),
    ),
    responses(
        (status = 200, description = "Active users", body = PresenceResponse),
        (status = 401, description = "Unauthorized"),
    ),
    tag = "queue"
)]
async fn get_presence(
    _current_user: CurrentUser,
    Path(project_id): Path<Uuid>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<PresenceResponse>, ApiError> {
    // Get users active in last 5 minutes
    let rows: Vec<PresenceRow> = sqlx::query_as(
        r#"
        SELECT
            up.user_id,
            u.display_name,
            u.avatar_url,
            up.last_seen_at
        FROM user_presence up
        JOIN users u ON up.user_id = u.user_id
        WHERE up.project_id = $1
          AND up.last_seen_at > NOW() - INTERVAL '5 minutes'
        ORDER BY up.last_seen_at DESC
        "#,
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError::Internal(e.into()))?;

    let active_users: Vec<UserPresence> = rows
        .into_iter()
        .map(|r| UserPresence {
            user_id: r.user_id,
            display_name: r.display_name,
            avatar_url: r.avatar_url,
            last_seen_at: r.last_seen_at,
        })
        .collect();

    Ok(Json(PresenceResponse {
        project_id,
        active_users,
    }))
}

/// WebSocket endpoint for real-time queue updates
pub async fn queue_websocket(
    ws: WebSocketUpgrade,
    current_user: CurrentUser,
    State(hub): State<Arc<QueueUpdateHub>>,
    Extension(pool): Extension<PgPool>,
) -> impl IntoResponse {
    let user_id = *current_user.user_id.as_uuid();
    ws.on_upgrade(move |socket| handle_socket(socket, hub, pool, user_id))
}

/// Handle a WebSocket connection
async fn handle_socket(
    mut socket: WebSocket,
    hub: Arc<QueueUpdateHub>,
    pool: PgPool,
    user_id: Uuid,
) {
    // Subscribe to user's queue updates
    let mut user_rx = hub.subscribe_user(user_id).await;

    // Track subscribed projects for presence
    let mut subscribed_projects: HashMap<Uuid, tokio::sync::broadcast::Receiver<QueueEvent>> =
        HashMap::new();

    loop {
        tokio::select! {
            // Forward hub events to WebSocket
            Ok(event) = user_rx.recv() => {
                let msg = serde_json::to_string(&event).unwrap_or_default();
                if socket.send(Message::Text(msg.into())).await.is_err() {
                    break;
                }
            }

            // Handle incoming messages from client
            Some(msg) = socket.recv() => {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                            match client_msg {
                                ClientMessage::Ping { timestamp } => {
                                    let pong = QueueEvent::Pong { timestamp };
                                    let msg = serde_json::to_string(&pong).unwrap_or_default();
                                    if socket.send(Message::Text(msg.into())).await.is_err() {
                                        break;
                                    }
                                }
                                ClientMessage::SubscribeProject { project_id } => {
                                    if !subscribed_projects.contains_key(&project_id) {
                                        let rx = hub.subscribe_project(project_id).await;
                                        subscribed_projects.insert(project_id, rx);
                                    }
                                }
                                ClientMessage::UnsubscribeProject { project_id } => {
                                    subscribed_projects.remove(&project_id);
                                    hub.cleanup_project(project_id).await;
                                }
                                ClientMessage::Activity { project_id } => {
                                    // Update presence
                                    if let Some(pid) = project_id {
                                        let _ = update_user_presence(&pool, user_id, pid).await;
                                    }
                                }
                            }
                        }
                    }
                    Ok(Message::Ping(data)) => {
                        if socket.send(Message::Pong(data)).await.is_err() {
                            break;
                        }
                    }
                    Ok(Message::Close(_)) => break,
                    Err(_) => break,
                    _ => {}
                }
            }
        }

        // Also check project subscriptions for events
        for (project_id, rx) in subscribed_projects.iter_mut() {
            if let Ok(event) = rx.try_recv() {
                let msg = serde_json::to_string(&event).unwrap_or_default();
                if socket.send(Message::Text(msg.into())).await.is_err() {
                    break;
                }
            }
            let _ = project_id; // silence unused warning
        }
    }

    // Cleanup on disconnect
    hub.cleanup_user(user_id).await;
    for project_id in subscribed_projects.keys() {
        hub.cleanup_project(*project_id).await;
    }
}

/// Update user presence for a project
async fn update_user_presence(
    pool: &PgPool,
    user_id: Uuid,
    project_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO user_presence (user_id, project_id, last_seen_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, project_id)
        DO UPDATE SET last_seen_at = NOW()
        "#,
    )
    .bind(user_id)
    .bind(project_id)
    .execute(pool)
    .await?;
    Ok(())
}

// =============================================================================
// Accept/Reject Endpoints
// =============================================================================

/// Request to reject an assignment
#[derive(Debug, Deserialize, ToSchema)]
pub struct RejectRequest {
    pub reason: glyph_domain::RejectReason,
}

/// Response after accepting a task
#[derive(Debug, Serialize, ToSchema)]
pub struct AcceptResponse {
    pub assignment_id: Uuid,
    pub task_id: Uuid,
    pub redirect_url: String,
}

/// Accept a task assignment
#[utoipa::path(
    post,
    path = "/api/v1/queue/{assignment_id}/accept",
    params(
        ("assignment_id" = Uuid, Path, description = "Assignment ID"),
    ),
    responses(
        (status = 200, description = "Task accepted", body = AcceptResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Assignment belongs to another user"),
        (status = 404, description = "Assignment not found"),
        (status = 409, description = "Assignment cannot be accepted in current state"),
    ),
    tag = "queue"
)]
async fn accept_task(
    current_user: CurrentUser,
    Path(assignment_id): Path<Uuid>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<AcceptResponse>, ApiError> {
    use glyph_db::{AssignmentRepository, PgAssignmentRepository};
    use glyph_domain::{AssignmentId, AssignmentStatus};

    let repo = PgAssignmentRepository::new(pool);
    let assignment_id_typed = AssignmentId::from_uuid(assignment_id);

    // 1. Verify assignment exists and belongs to current user
    let assignment = repo
        .find_by_id(&assignment_id_typed)
        .await
        .map_err(|e| ApiError::Internal(e.into()))?
        .ok_or_else(|| ApiError::NotFound {
            resource_type: "assignment",
            id: assignment_id.to_string(),
        })?;

    if assignment.user_id != current_user.user_id {
        return Err(ApiError::Forbidden {
            message: "Assignment belongs to another user".to_string(),
        });
    }

    // 2. Check assignment status is 'assigned'
    if assignment.status != AssignmentStatus::Assigned {
        return Err(ApiError::Conflict {
            message: "Assignment cannot be accepted in current state".to_string(),
        });
    }

    // 3. Update to 'accepted'
    repo.update_status(&assignment_id_typed, AssignmentStatus::Accepted)
        .await
        .map_err(|e| ApiError::Internal(e.into()))?;

    Ok(Json(AcceptResponse {
        assignment_id,
        task_id: *assignment.task_id.as_uuid(),
        redirect_url: format!("/annotate/{}", assignment.task_id),
    }))
}

/// Reject a task assignment
#[utoipa::path(
    post,
    path = "/api/v1/queue/{assignment_id}/reject",
    params(
        ("assignment_id" = Uuid, Path, description = "Assignment ID"),
    ),
    request_body = RejectRequest,
    responses(
        (status = 204, description = "Task rejected"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Assignment belongs to another user"),
        (status = 404, description = "Assignment not found"),
    ),
    tag = "queue"
)]
async fn reject_task(
    current_user: CurrentUser,
    Path(assignment_id): Path<Uuid>,
    Extension(pool): Extension<PgPool>,
    Json(req): Json<RejectRequest>,
) -> Result<StatusCode, ApiError> {
    use glyph_db::{
        AssignmentRepository, PgAssignmentRepository, PgTaskRepository, RejectAssignment,
        TaskRepository,
    };
    use glyph_domain::AssignmentId;

    let assignment_repo = PgAssignmentRepository::new(pool.clone());
    let task_repo = PgTaskRepository::new(pool);
    let assignment_id_typed = AssignmentId::from_uuid(assignment_id);

    // 1. Verify assignment exists and belongs to current user
    let assignment = assignment_repo
        .find_by_id(&assignment_id_typed)
        .await
        .map_err(|e| ApiError::Internal(e.into()))?
        .ok_or_else(|| ApiError::NotFound {
            resource_type: "assignment",
            id: assignment_id.to_string(),
        })?;

    if assignment.user_id != current_user.user_id {
        return Err(ApiError::Forbidden {
            message: "Assignment belongs to another user".to_string(),
        });
    }

    // 2. Record rejection
    assignment_repo
        .reject(&RejectAssignment {
            assignment_id: assignment_id_typed,
            reason: serde_json::to_value(&req.reason).unwrap_or_default(),
        })
        .await
        .map_err(|e| ApiError::Internal(e.into()))?;

    // 3. Set task cooldown (2 minutes default)
    let cooldown_until = chrono::Utc::now() + chrono::Duration::minutes(2);
    task_repo
        .set_cooldown(&assignment.task_id, cooldown_until)
        .await
        .map_err(|e| ApiError::Internal(e.into()))?;

    Ok(StatusCode::NO_CONTENT)
}

/// Request to claim a task from the pool
#[derive(Debug, Deserialize, ToSchema)]
pub struct ClaimRequest {
    pub task_id: Uuid,
    pub step_id: String,
}

/// Claim a task from the pool (for pool assignment mode)
#[utoipa::path(
    post,
    path = "/api/v1/queue/claim",
    request_body = ClaimRequest,
    responses(
        (status = 200, description = "Task claimed", body = AcceptResponse),
        (status = 401, description = "Unauthorized"),
        (status = 409, description = "Task unavailable or already claimed"),
    ),
    tag = "queue"
)]
async fn claim_from_pool(
    current_user: CurrentUser,
    Extension(pool): Extension<PgPool>,
    Json(req): Json<ClaimRequest>,
) -> Result<Json<AcceptResponse>, ApiError> {
    use glyph_domain::AssignmentId;

    let user_id = *current_user.user_id.as_uuid();

    // Use a transaction with SKIP LOCKED to prevent race conditions
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| ApiError::Internal(e.into()))?;

    // 1. Lock the task if available
    let task: Option<TaskClaimRow> = sqlx::query_as(
        r#"
        SELECT task_id, project_id
        FROM tasks
        WHERE task_id = $1
          AND status = 'pending'
          AND (cooldown_until IS NULL OR cooldown_until < NOW())
        FOR UPDATE SKIP LOCKED
        "#,
    )
    .bind(req.task_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| ApiError::Internal(e.into()))?;

    let task = task.ok_or_else(|| ApiError::Conflict {
        message: "Task unavailable or already claimed".to_string(),
    })?;

    // 2. Check user hasn't already been assigned this task
    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT assignment_id FROM task_assignments WHERE task_id = $1 AND user_id = $2",
    )
    .bind(req.task_id)
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| ApiError::Internal(e.into()))?;

    if existing.is_some() {
        return Err(ApiError::Conflict {
            message: "You have already been assigned this task".to_string(),
        });
    }

    // 3. Create assignment
    let assignment_id = AssignmentId::new();
    sqlx::query(
        r#"
        INSERT INTO task_assignments (assignment_id, task_id, project_id, step_id, user_id, status)
        VALUES ($1, $2, $3, $4, $5, 'assigned')
        "#,
    )
    .bind(assignment_id.as_uuid())
    .bind(req.task_id)
    .bind(task.project_id)
    .bind(&req.step_id)
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| ApiError::Internal(e.into()))?;

    // 4. Update task version for optimistic locking
    sqlx::query("UPDATE tasks SET version = version + 1, updated_at = NOW() WHERE task_id = $1")
        .bind(req.task_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApiError::Internal(e.into()))?;

    tx.commit()
        .await
        .map_err(|e| ApiError::Internal(e.into()))?;

    Ok(Json(AcceptResponse {
        assignment_id: *assignment_id.as_uuid(),
        task_id: req.task_id,
        redirect_url: format!("/annotate/{}", req.task_id),
    }))
}

#[derive(sqlx::FromRow)]
struct TaskClaimRow {
    task_id: Uuid,
    project_id: Uuid,
}

// =============================================================================
// Router
// =============================================================================

/// Queue routes (require WebSocket hub state)
pub fn routes() -> Router<Arc<QueueUpdateHub>> {
    Router::new()
        .route("/", get(get_queue))
        .route("/stats", get(get_queue_stats))
        .route("/presence/{project_id}", get(get_presence))
        .route("/ws", get(queue_websocket))
        .route("/{assignment_id}/accept", axum::routing::post(accept_task))
        .route("/{assignment_id}/reject", axum::routing::post(reject_task))
        .route("/claim", axum::routing::post(claim_from_pool))
}

/// Queue routes without WebSocket (for testing or when hub not available)
pub fn routes_without_ws() -> Router {
    Router::new()
        .route("/", get(get_queue))
        .route("/stats", get(get_queue_stats))
        .route("/presence/{project_id}", get(get_presence))
        .route("/{assignment_id}/accept", axum::routing::post(accept_task))
        .route("/{assignment_id}/reject", axum::routing::post(reject_task))
        .route("/claim", axum::routing::post(claim_from_pool))
}
