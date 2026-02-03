//! Event store for persisting workflow events
//!
//! Provides append-only storage with optimistic concurrency control
//! and automatic snapshotting every 50 events.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use thiserror::Error;
use tokio::sync::RwLock;
use uuid::Uuid;

use super::event_types::{StoredEvent, WorkflowEvent};
use crate::state::WorkflowSnapshot;

// =============================================================================
// Constants
// =============================================================================

/// Snapshot interval per RESEARCH.md: snapshot every 50 events
pub const SNAPSHOT_INTERVAL: u64 = 50;

// =============================================================================
// Errors
// =============================================================================

/// Event store errors
#[derive(Debug, Error)]
pub enum EventStoreError {
    /// Optimistic concurrency conflict
    #[error("Concurrency conflict: expected version {expected}, found {actual}")]
    ConcurrencyConflict { expected: u64, actual: u64 },

    /// Stream not found
    #[error("Stream not found: {0}")]
    StreamNotFound(Uuid),

    /// Database error
    #[error("Database error: {0}")]
    DatabaseError(String),

    /// Serialization error
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

impl From<sqlx::Error> for EventStoreError {
    fn from(err: sqlx::Error) -> Self {
        Self::DatabaseError(err.to_string())
    }
}

impl From<serde_json::Error> for EventStoreError {
    fn from(err: serde_json::Error) -> Self {
        Self::SerializationError(err.to_string())
    }
}

// =============================================================================
// Event Store Trait
// =============================================================================

/// Trait for event store implementations
#[async_trait]
pub trait EventStore: Send + Sync {
    /// Append events to a stream
    ///
    /// Returns the new version after appending.
    /// Uses optimistic concurrency - fails if version has changed.
    async fn append(
        &self,
        stream_id: Uuid,
        stream_type: &str,
        expected_version: Option<u64>,
        events: Vec<WorkflowEvent>,
        metadata: serde_json::Value,
    ) -> Result<u64, EventStoreError>;

    /// Load events from a stream starting from a version
    async fn load_events(
        &self,
        stream_id: Uuid,
        from_version: u64,
    ) -> Result<Vec<StoredEvent>, EventStoreError>;

    /// Get the latest snapshot for a stream
    async fn get_latest_snapshot(
        &self,
        stream_id: Uuid,
    ) -> Result<Option<WorkflowSnapshot>, EventStoreError>;

    /// Save a snapshot for a stream
    async fn save_snapshot(
        &self,
        stream_id: Uuid,
        stream_type: &str,
        snapshot: &WorkflowSnapshot,
    ) -> Result<(), EventStoreError>;

    /// Get the current version of a stream
    async fn get_stream_version(&self, stream_id: Uuid) -> Result<Option<u64>, EventStoreError>;
}

// =============================================================================
// PostgreSQL Event Store
// =============================================================================

/// PostgreSQL-backed event store
pub struct PgEventStore {
    pool: PgPool,
    /// Cache of stream versions for optimistic concurrency
    version_cache: Arc<RwLock<HashMap<Uuid, u64>>>,
}

impl PgEventStore {
    /// Create a new PostgreSQL event store
    #[must_use]
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            version_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Get cached version or fetch from database
    async fn get_or_fetch_version(&self, stream_id: Uuid) -> Result<u64, EventStoreError> {
        // Check cache first
        {
            let cache = self.version_cache.read().await;
            if let Some(&version) = cache.get(&stream_id) {
                return Ok(version);
            }
        }

        // Fetch from database
        let row: Option<(i64,)> = sqlx::query_as(
            "SELECT COALESCE(MAX(version), 0) FROM workflow_events WHERE stream_id = $1",
        )
        .bind(stream_id)
        .fetch_optional(&self.pool)
        .await?;

        let version = row.map(|(v,)| v as u64).unwrap_or(0);

        // Update cache
        {
            let mut cache = self.version_cache.write().await;
            cache.insert(stream_id, version);
        }

        Ok(version)
    }

    /// Check if a snapshot should be created
    fn should_snapshot(version: u64) -> bool {
        version > 0 && version % SNAPSHOT_INTERVAL == 0
    }
}

#[async_trait]
impl EventStore for PgEventStore {
    async fn append(
        &self,
        stream_id: Uuid,
        stream_type: &str,
        expected_version: Option<u64>,
        events: Vec<WorkflowEvent>,
        metadata: serde_json::Value,
    ) -> Result<u64, EventStoreError> {
        if events.is_empty() {
            return self.get_or_fetch_version(stream_id).await;
        }

        let current_version = self.get_or_fetch_version(stream_id).await?;

        // Check optimistic concurrency
        if let Some(expected) = expected_version {
            if current_version != expected {
                return Err(EventStoreError::ConcurrencyConflict {
                    expected,
                    actual: current_version,
                });
            }
        }

        let mut tx = self.pool.begin().await?;
        let mut new_version = current_version;

        for event in &events {
            new_version += 1;

            let event_id = Uuid::new_v4();
            let event_type = event.event_type();
            let event_data = serde_json::to_value(event)?;
            let occurred_at = event.occurred_at();

            sqlx::query(
                r#"
                INSERT INTO workflow_events
                    (event_id, stream_id, stream_type, version, event_type, event_data, metadata, occurred_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                "#,
            )
            .bind(event_id)
            .bind(stream_id)
            .bind(stream_type)
            .bind(new_version as i64)
            .bind(event_type)
            .bind(&event_data)
            .bind(&metadata)
            .bind(occurred_at)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        // Update cache
        {
            let mut cache = self.version_cache.write().await;
            cache.insert(stream_id, new_version);
        }

        Ok(new_version)
    }

    async fn load_events(
        &self,
        stream_id: Uuid,
        from_version: u64,
    ) -> Result<Vec<StoredEvent>, EventStoreError> {
        let rows: Vec<EventRow> = sqlx::query_as(
            r#"
            SELECT event_id, stream_id, stream_type, version, event_type, event_data, metadata, occurred_at
            FROM workflow_events
            WHERE stream_id = $1 AND version > $2
            ORDER BY version ASC
            "#,
        )
        .bind(stream_id)
        .bind(from_version as i64)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(|row| row.try_into())
            .collect::<Result<Vec<_>, _>>()
    }

    async fn get_latest_snapshot(
        &self,
        stream_id: Uuid,
    ) -> Result<Option<WorkflowSnapshot>, EventStoreError> {
        let row: Option<SnapshotRow> = sqlx::query_as(
            r#"
            SELECT snapshot_id, stream_id, stream_type, version, state, created_at
            FROM workflow_snapshots
            WHERE stream_id = $1
            ORDER BY version DESC
            LIMIT 1
            "#,
        )
        .bind(stream_id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(r) => {
                let snapshot: WorkflowSnapshot = serde_json::from_value(r.state)?;
                Ok(Some(snapshot))
            }
            None => Ok(None),
        }
    }

    async fn save_snapshot(
        &self,
        stream_id: Uuid,
        stream_type: &str,
        snapshot: &WorkflowSnapshot,
    ) -> Result<(), EventStoreError> {
        let state = serde_json::to_value(snapshot)?;

        sqlx::query(
            r#"
            INSERT INTO workflow_snapshots (stream_id, stream_type, version, state)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (stream_id, version) DO UPDATE SET state = EXCLUDED.state
            "#,
        )
        .bind(stream_id)
        .bind(stream_type)
        .bind(snapshot.version as i64)
        .bind(&state)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_stream_version(&self, stream_id: Uuid) -> Result<Option<u64>, EventStoreError> {
        let row: Option<(i64,)> =
            sqlx::query_as("SELECT MAX(version) FROM workflow_events WHERE stream_id = $1")
                .bind(stream_id)
                .fetch_optional(&self.pool)
                .await?;

        Ok(row.and_then(|(v,)| if v > 0 { Some(v as u64) } else { None }))
    }
}

// =============================================================================
// Database Row Types
// =============================================================================

/// Row type for workflow_events table
#[derive(Debug, sqlx::FromRow)]
struct EventRow {
    event_id: Uuid,
    stream_id: Uuid,
    stream_type: String,
    version: i64,
    #[allow(dead_code)]
    event_type: String,
    event_data: serde_json::Value,
    metadata: serde_json::Value,
    occurred_at: DateTime<Utc>,
}

impl TryFrom<EventRow> for StoredEvent {
    type Error = EventStoreError;

    fn try_from(row: EventRow) -> Result<Self, Self::Error> {
        let event: WorkflowEvent = serde_json::from_value(row.event_data)?;

        Ok(StoredEvent {
            event_id: row.event_id,
            stream_id: row.stream_id,
            stream_type: row.stream_type,
            version: row.version as u64,
            event,
            metadata: row.metadata,
            occurred_at: row.occurred_at,
        })
    }
}

/// Row type for workflow_snapshots table
#[derive(Debug, sqlx::FromRow)]
struct SnapshotRow {
    #[allow(dead_code)]
    snapshot_id: Uuid,
    #[allow(dead_code)]
    stream_id: Uuid,
    #[allow(dead_code)]
    stream_type: String,
    #[allow(dead_code)]
    version: i64,
    state: serde_json::Value,
    #[allow(dead_code)]
    created_at: DateTime<Utc>,
}

// =============================================================================
// Helper: Event Store with Auto-Snapshot
// =============================================================================

/// Wrapper that automatically creates snapshots
pub struct AutoSnapshotEventStore<S: EventStore> {
    inner: S,
    /// Function to get current state for snapshotting
    state_provider: Arc<dyn Fn(Uuid) -> Option<WorkflowSnapshot> + Send + Sync>,
}

impl<S: EventStore> AutoSnapshotEventStore<S> {
    /// Create a new auto-snapshot event store
    pub fn new(
        inner: S,
        state_provider: Arc<dyn Fn(Uuid) -> Option<WorkflowSnapshot> + Send + Sync>,
    ) -> Self {
        Self {
            inner,
            state_provider,
        }
    }
}

#[async_trait]
impl<S: EventStore> EventStore for AutoSnapshotEventStore<S> {
    async fn append(
        &self,
        stream_id: Uuid,
        stream_type: &str,
        expected_version: Option<u64>,
        events: Vec<WorkflowEvent>,
        metadata: serde_json::Value,
    ) -> Result<u64, EventStoreError> {
        let new_version = self
            .inner
            .append(stream_id, stream_type, expected_version, events, metadata)
            .await?;

        // Check if we should create a snapshot
        if PgEventStore::should_snapshot(new_version) {
            if let Some(snapshot) = (self.state_provider)(stream_id) {
                // Fire and forget - snapshot creation shouldn't block
                let _ = self
                    .inner
                    .save_snapshot(stream_id, stream_type, &snapshot)
                    .await;
            }
        }

        Ok(new_version)
    }

    async fn load_events(
        &self,
        stream_id: Uuid,
        from_version: u64,
    ) -> Result<Vec<StoredEvent>, EventStoreError> {
        self.inner.load_events(stream_id, from_version).await
    }

    async fn get_latest_snapshot(
        &self,
        stream_id: Uuid,
    ) -> Result<Option<WorkflowSnapshot>, EventStoreError> {
        self.inner.get_latest_snapshot(stream_id).await
    }

    async fn save_snapshot(
        &self,
        stream_id: Uuid,
        stream_type: &str,
        snapshot: &WorkflowSnapshot,
    ) -> Result<(), EventStoreError> {
        self.inner
            .save_snapshot(stream_id, stream_type, snapshot)
            .await
    }

    async fn get_stream_version(&self, stream_id: Uuid) -> Result<Option<u64>, EventStoreError> {
        self.inner.get_stream_version(stream_id).await
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_snapshot() {
        assert!(!PgEventStore::should_snapshot(0));
        assert!(!PgEventStore::should_snapshot(49));
        assert!(PgEventStore::should_snapshot(50));
        assert!(!PgEventStore::should_snapshot(51));
        assert!(PgEventStore::should_snapshot(100));
        assert!(PgEventStore::should_snapshot(150));
    }

    #[test]
    fn test_snapshot_interval_is_50() {
        assert_eq!(SNAPSHOT_INTERVAL, 50);
    }
}
