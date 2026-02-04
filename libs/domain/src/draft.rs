//! Draft domain models for auto-saved annotation work.
//!
//! Drafts allow annotators to save work in progress automatically,
//! preventing data loss during annotation sessions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::ids::{DraftId, TaskId, UserId};

/// Auto-saved annotation work in progress.
/// Only one draft per (task_id, user_id) pair.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Draft {
    pub draft_id: DraftId,
    pub task_id: TaskId,
    pub user_id: UserId,
    /// Annotation data in progress
    pub data: serde_json::Value,
    /// Optimistic locking version
    pub version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Draft {
    /// Create a new draft with initial data.
    pub fn new(task_id: TaskId, user_id: UserId, data: serde_json::Value) -> Self {
        let now = Utc::now();
        Self {
            draft_id: DraftId::new(),
            task_id,
            user_id,
            data,
            version: 1,
            created_at: now,
            updated_at: now,
        }
    }

    /// Update draft data and increment version.
    pub fn update(&mut self, data: serde_json::Value) {
        self.data = data;
        self.version += 1;
        self.updated_at = Utc::now();
    }
}

/// Request to save or update a draft.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveDraftRequest {
    pub data: serde_json::Value,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_draft_new() {
        let task_id = TaskId::new();
        let user_id = UserId::new();
        let data = serde_json::json!({"field": "value"});

        let draft = Draft::new(task_id, user_id, data.clone());

        assert_eq!(draft.task_id, task_id);
        assert_eq!(draft.user_id, user_id);
        assert_eq!(draft.data, data);
        assert_eq!(draft.version, 1);
    }

    #[test]
    fn test_draft_update() {
        let task_id = TaskId::new();
        let user_id = UserId::new();
        let initial_data = serde_json::json!({"field": "initial"});
        let mut draft = Draft::new(task_id, user_id, initial_data);

        let updated_data = serde_json::json!({"field": "updated"});
        draft.update(updated_data.clone());

        assert_eq!(draft.data, updated_data);
        assert_eq!(draft.version, 2);
    }
}
