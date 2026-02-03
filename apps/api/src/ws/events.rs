//! WebSocket event types for real-time queue updates

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;
use uuid::Uuid;

/// Events broadcast via WebSocket for queue updates
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum QueueEvent {
    /// New task assigned to user
    TaskAssigned {
        task_id: Uuid,
        assignment_id: Uuid,
        project_id: Uuid,
        step_id: String,
        priority: i32,
    },

    /// Task reassigned to different user
    TaskReassigned {
        task_id: Uuid,
        old_user_id: Uuid,
        new_user_id: Uuid,
        reason: String,
    },

    /// Assignment status changed
    TaskStatusChanged {
        task_id: Uuid,
        assignment_id: Uuid,
        old_status: String,
        new_status: String,
    },

    /// Queue counts changed
    QueueCountChanged {
        total: i64,
        by_project: HashMap<Uuid, i64>,
    },

    /// Task became unavailable (e.g., deleted, reassigned away)
    TaskUnavailable { task_id: Uuid, reason: String },

    /// User presence update
    PresenceUpdate {
        project_id: Uuid,
        user_id: Uuid,
        display_name: String,
        /// "joined" | "left" | "active"
        action: String,
    },

    /// Heartbeat/ping response
    Pong { timestamp: i64 },

    /// Error event
    Error { code: String, message: String },
}

/// Client-to-server messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    /// Ping to keep connection alive
    Ping { timestamp: i64 },

    /// Subscribe to project presence updates
    SubscribeProject { project_id: Uuid },

    /// Unsubscribe from project presence updates
    UnsubscribeProject { project_id: Uuid },

    /// Report activity (updates presence)
    Activity { project_id: Option<Uuid> },
}
