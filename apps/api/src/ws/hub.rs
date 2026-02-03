//! WebSocket broadcast hub for queue updates
//!
//! Manages per-user and per-project broadcast channels for real-time updates.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

use super::events::QueueEvent;

/// Capacity for broadcast channels
const CHANNEL_CAPACITY: usize = 256;

/// Hub for broadcasting queue events to connected WebSocket clients
pub struct QueueUpdateHub {
    /// Per-user broadcast channels for queue updates
    user_channels: Arc<RwLock<HashMap<Uuid, broadcast::Sender<QueueEvent>>>>,
    /// Per-project broadcast channels for presence updates
    project_channels: Arc<RwLock<HashMap<Uuid, broadcast::Sender<QueueEvent>>>>,
}

impl Default for QueueUpdateHub {
    fn default() -> Self {
        Self::new()
    }
}

impl QueueUpdateHub {
    /// Create a new queue update hub
    pub fn new() -> Self {
        Self {
            user_channels: Arc::new(RwLock::new(HashMap::new())),
            project_channels: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Subscribe to queue updates for a specific user
    ///
    /// Creates a new channel if one doesn't exist. Returns a receiver that
    /// will receive all events broadcast to this user.
    pub async fn subscribe_user(&self, user_id: Uuid) -> broadcast::Receiver<QueueEvent> {
        let mut channels = self.user_channels.write().await;

        if let Some(sender) = channels.get(&user_id) {
            sender.subscribe()
        } else {
            let (tx, rx) = broadcast::channel(CHANNEL_CAPACITY);
            channels.insert(user_id, tx);
            rx
        }
    }

    /// Subscribe to presence updates for a specific project
    pub async fn subscribe_project(&self, project_id: Uuid) -> broadcast::Receiver<QueueEvent> {
        let mut channels = self.project_channels.write().await;

        if let Some(sender) = channels.get(&project_id) {
            sender.subscribe()
        } else {
            let (tx, rx) = broadcast::channel(CHANNEL_CAPACITY);
            channels.insert(project_id, tx);
            rx
        }
    }

    /// Broadcast an event to a specific user
    ///
    /// If the user has no active subscribers, the event is dropped silently.
    pub async fn broadcast_to_user(&self, user_id: Uuid, event: QueueEvent) {
        let channels = self.user_channels.read().await;

        if let Some(sender) = channels.get(&user_id) {
            // Ignore send errors (no receivers)
            let _ = sender.send(event);
        }
    }

    /// Broadcast an event to all users subscribed to a project
    pub async fn broadcast_to_project(&self, project_id: Uuid, event: QueueEvent) {
        let channels = self.project_channels.read().await;

        if let Some(sender) = channels.get(&project_id) {
            let _ = sender.send(event);
        }
    }

    /// Broadcast an event to multiple users
    pub async fn broadcast_to_users(&self, user_ids: &[Uuid], event: QueueEvent) {
        let channels = self.user_channels.read().await;

        for user_id in user_ids {
            if let Some(sender) = channels.get(user_id) {
                let _ = sender.send(event.clone());
            }
        }
    }

    /// Clean up a user's channel when they disconnect
    ///
    /// Only removes the channel if there are no remaining receivers.
    pub async fn cleanup_user(&self, user_id: Uuid) {
        let mut channels = self.user_channels.write().await;

        if let Some(sender) = channels.get(&user_id) {
            // If receiver_count is 0, remove the channel
            if sender.receiver_count() == 0 {
                channels.remove(&user_id);
            }
        }
    }

    /// Clean up a project's channel when the last user unsubscribes
    pub async fn cleanup_project(&self, project_id: Uuid) {
        let mut channels = self.project_channels.write().await;

        if let Some(sender) = channels.get(&project_id) {
            if sender.receiver_count() == 0 {
                channels.remove(&project_id);
            }
        }
    }

    /// Get count of active user subscriptions
    pub async fn user_subscription_count(&self) -> usize {
        self.user_channels.read().await.len()
    }

    /// Get count of active project subscriptions
    pub async fn project_subscription_count(&self) -> usize {
        self.project_channels.read().await.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_user_subscription() {
        let hub = QueueUpdateHub::new();
        let user_id = Uuid::new_v4();

        let mut rx = hub.subscribe_user(user_id).await;

        let event = QueueEvent::TaskAssigned {
            task_id: Uuid::new_v4(),
            assignment_id: Uuid::new_v4(),
            project_id: Uuid::new_v4(),
            step_id: "annotation".to_string(),
            priority: 5,
        };

        hub.broadcast_to_user(user_id, event.clone()).await;

        let received = rx.recv().await.unwrap();
        match received {
            QueueEvent::TaskAssigned { priority, .. } => {
                assert_eq!(priority, 5);
            }
            _ => panic!("Wrong event type"),
        }
    }

    #[tokio::test]
    async fn test_cleanup_removes_empty_channel() {
        let hub = QueueUpdateHub::new();
        let user_id = Uuid::new_v4();

        // Subscribe and then drop the receiver
        let rx = hub.subscribe_user(user_id).await;
        drop(rx);

        // Cleanup should remove the channel
        hub.cleanup_user(user_id).await;

        assert_eq!(hub.user_subscription_count().await, 0);
    }
}
