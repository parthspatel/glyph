//! Audit trail infrastructure for field-level change tracking
//!
//! Records all mutating operations with full data snapshots and diffs.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::PgPool;
use thiserror::Error;

/// Type of audit action
#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "audit_action", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    Create,
    Read,
    Update,
    Delete,
}

/// Type of actor performing the action
#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "audit_actor_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum AuditActorType {
    User,
    System,
    Api,
}

/// An audit event to be recorded
#[derive(Debug, Clone, Serialize)]
pub struct AuditEvent {
    /// Type of entity (e.g., "user", "project", "task")
    pub entity_type: &'static str,
    /// ID of the entity (prefixed ID string)
    pub entity_id: String,
    /// Action performed
    pub action: AuditAction,
    /// ID of the actor (prefixed user ID or "system")
    pub actor_id: String,
    /// Type of actor
    pub actor_type: AuditActorType,
    /// Full snapshot of entity data at time of event
    pub data_snapshot: Value,
    /// Field-level changes (for updates)
    pub changes: Option<Value>,
    /// Request correlation ID
    pub request_id: Option<String>,
}

/// Errors from audit operations
#[derive(Debug, Error)]
pub enum AuditError {
    #[error("failed to record audit event: {0}")]
    Database(#[from] sqlx::Error),
    #[error("failed to serialize audit data: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// System actor ID for automated operations
pub const SYSTEM_ACTOR_ID: &str = "system";

/// Writer for audit events
#[derive(Clone)]
pub struct AuditWriter {
    pool: PgPool,
}

impl AuditWriter {
    /// Create a new audit writer
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Record an audit event
    ///
    /// Note: This intentionally does not fail the operation if audit recording fails.
    /// Audit failures are logged but don't block the main operation.
    pub async fn record(&self, event: AuditEvent) -> Result<(), AuditError> {
        sqlx::query(
            r#"
            INSERT INTO audit_events
            (entity_type, entity_id, action, actor_id, actor_type,
             data_snapshot, changes, request_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(event.entity_type)
        .bind(&event.entity_id)
        .bind(event.action)
        .bind(&event.actor_id)
        .bind(event.actor_type)
        .bind(&event.data_snapshot)
        .bind(&event.changes)
        .bind(&event.request_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Record an audit event, logging errors but not failing
    pub async fn record_best_effort(&self, event: AuditEvent) {
        if let Err(e) = self.record(event).await {
            tracing::warn!("Failed to record audit event: {}", e);
        }
    }

    /// Compute field-level diff between old and new values
    pub fn compute_changes(old: &Value, new: &Value) -> Option<Value> {
        let mut changes = serde_json::Map::new();

        if let (Value::Object(old_obj), Value::Object(new_obj)) = (old, new) {
            // Find changed and added fields
            for (key, new_val) in new_obj {
                match old_obj.get(key) {
                    Some(old_val) if old_val != new_val => {
                        changes.insert(
                            key.clone(),
                            serde_json::json!({
                                "old": old_val,
                                "new": new_val
                            }),
                        );
                    }
                    None => {
                        changes.insert(
                            key.clone(),
                            serde_json::json!({
                                "old": null,
                                "new": new_val
                            }),
                        );
                    }
                    _ => {}
                }
            }

            // Find removed fields
            for key in old_obj.keys() {
                if !new_obj.contains_key(key) {
                    changes.insert(
                        key.clone(),
                        serde_json::json!({
                            "old": old_obj.get(key),
                            "new": null
                        }),
                    );
                }
            }
        }

        if changes.is_empty() {
            None
        } else {
            Some(Value::Object(changes))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_changes_added_field() {
        let old = serde_json::json!({"name": "Alice"});
        let new = serde_json::json!({"name": "Alice", "email": "alice@example.com"});

        let changes = AuditWriter::compute_changes(&old, &new).unwrap();
        assert_eq!(
            changes,
            serde_json::json!({
                "email": {"old": null, "new": "alice@example.com"}
            })
        );
    }

    #[test]
    fn test_compute_changes_modified_field() {
        let old = serde_json::json!({"name": "Alice", "status": "active"});
        let new = serde_json::json!({"name": "Alice", "status": "inactive"});

        let changes = AuditWriter::compute_changes(&old, &new).unwrap();
        assert_eq!(
            changes,
            serde_json::json!({
                "status": {"old": "active", "new": "inactive"}
            })
        );
    }

    #[test]
    fn test_compute_changes_no_changes() {
        let old = serde_json::json!({"name": "Alice"});
        let new = serde_json::json!({"name": "Alice"});

        let changes = AuditWriter::compute_changes(&old, &new);
        assert!(changes.is_none());
    }

    #[test]
    fn test_compute_changes_removed_field() {
        let old = serde_json::json!({"name": "Alice", "temp": "value"});
        let new = serde_json::json!({"name": "Alice"});

        let changes = AuditWriter::compute_changes(&old, &new).unwrap();
        assert!(changes.get("temp").is_some());
    }
}
