//! Goal tracker with debounced updates
//!
//! Tracks goal progress with debouncing (5-10 seconds per CONTEXT.md)
//! and configurable completion actions.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use uuid::Uuid;

use super::goal_evaluator::{AlertCondition, EvaluationResult, GoalEvaluator};

// =============================================================================
// Constants
// =============================================================================

/// Default debounce duration per CONTEXT.md (5-10 seconds, using 5s)
pub const DEBOUNCE_DURATION: Duration = Duration::from_secs(5);

// =============================================================================
// Goal Data
// =============================================================================

/// Minimal goal data for tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackedGoal {
    /// Goal ID
    pub goal_id: Uuid,

    /// Goal name
    pub name: String,

    /// Target value
    pub target: f64,

    /// Current value
    pub current: f64,

    /// Goal deadline (if any)
    pub deadline: Option<DateTime<Utc>>,

    /// Alert thresholds (e.g., 0.25, 0.5, 0.75)
    #[serde(default)]
    pub alert_thresholds: Vec<f64>,
}

// =============================================================================
// Pending Update
// =============================================================================

/// A pending update that hasn't been flushed yet
#[derive(Debug, Clone)]
#[allow(dead_code)]
struct PendingUpdate {
    /// Goal ID
    goal_id: Uuid,

    /// Increment to apply
    increment: f64,

    /// When update was queued
    queued_at: Instant,
}

// =============================================================================
// Completion Actions
// =============================================================================

/// Action to take when a goal is completed
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CompletionAction {
    /// Send notification to specified recipients
    Notify { recipients: Vec<String> },

    /// Pause the project
    Pause,

    /// Trigger a webhook
    TriggerWebhook { url: String },

    /// Archive the project
    Archive,

    /// Custom action with payload
    Custom {
        action_type: String,
        payload: serde_json::Value,
    },
}

/// Result of executing a completion action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResult {
    /// Action that was executed
    pub action: CompletionAction,

    /// Whether it succeeded
    pub success: bool,

    /// Error message if failed
    pub error: Option<String>,

    /// When the action was executed
    pub executed_at: DateTime<Utc>,
}

// =============================================================================
// Goal Update
// =============================================================================

/// Record of a goal update
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalUpdate {
    /// Goal ID
    pub goal_id: Uuid,

    /// Previous value
    pub old_value: f64,

    /// New value
    pub new_value: f64,

    /// When update was applied
    pub evaluated_at: DateTime<Utc>,

    /// Any alerts triggered
    pub alerts: Vec<AlertCondition>,
}

// =============================================================================
// Goal Tracker
// =============================================================================

/// Tracks goal progress with debounced updates
pub struct GoalTracker {
    /// Tracked goals
    goals: HashMap<Uuid, TrackedGoal>,

    /// Pending updates (not yet flushed)
    pending_updates: HashMap<Uuid, PendingUpdate>,

    /// Goal evaluator
    evaluator: GoalEvaluator,

    /// Completion actions per goal
    completion_actions: HashMap<Uuid, Vec<CompletionAction>>,

    /// Previous evaluation results (for alert comparison)
    previous_results: HashMap<Uuid, EvaluationResult>,

    /// Debounce duration
    debounce_duration: Duration,
}

impl Default for GoalTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl GoalTracker {
    /// Create a new goal tracker
    #[must_use]
    pub fn new() -> Self {
        Self {
            goals: HashMap::new(),
            pending_updates: HashMap::new(),
            evaluator: GoalEvaluator::new(),
            completion_actions: HashMap::new(),
            previous_results: HashMap::new(),
            debounce_duration: DEBOUNCE_DURATION,
        }
    }

    /// Create with custom debounce duration
    #[must_use]
    pub fn with_debounce(debounce: Duration) -> Self {
        Self {
            debounce_duration: debounce,
            ..Self::new()
        }
    }

    /// Register a goal for tracking
    pub fn register_goal(&mut self, goal: TrackedGoal, actions: Vec<CompletionAction>) {
        let goal_id = goal.goal_id;
        self.goals.insert(goal_id, goal);
        if !actions.is_empty() {
            self.completion_actions.insert(goal_id, actions);
        }
    }

    /// Unregister a goal
    pub fn unregister_goal(&mut self, goal_id: Uuid) {
        self.goals.remove(&goal_id);
        self.pending_updates.remove(&goal_id);
        self.completion_actions.remove(&goal_id);
        self.previous_results.remove(&goal_id);
    }

    /// Record a contribution to a goal (debounced)
    pub fn record_contribution(&mut self, goal_id: Uuid, increment: f64) {
        let now = Instant::now();

        // Queue or accumulate update
        self.pending_updates
            .entry(goal_id)
            .and_modify(|u| {
                u.increment += increment;
                // Don't update queued_at - keep original time for debounce
            })
            .or_insert_with(|| PendingUpdate {
                goal_id,
                increment,
                queued_at: now,
            });
    }

    /// Flush pending updates that have been debounced long enough
    pub fn flush_pending(&mut self) -> Vec<GoalUpdate> {
        let now = Instant::now();
        let debounce = self.debounce_duration;

        // Find updates ready to flush
        let ready_ids: Vec<Uuid> = self
            .pending_updates
            .iter()
            .filter(|(_, u)| now.duration_since(u.queued_at) >= debounce)
            .map(|(id, _)| *id)
            .collect();

        let mut updates = Vec::new();

        for goal_id in ready_ids {
            if let Some(pending) = self.pending_updates.remove(&goal_id) {
                if let Some(goal) = self.goals.get_mut(&goal_id) {
                    let old_value = goal.current;
                    goal.current += pending.increment;
                    let new_value = goal.current;

                    // Evaluate and check alerts
                    let result = self.evaluator.evaluate_volume(
                        goal_id,
                        new_value as u64,
                        goal.target as u64,
                    );

                    let previous = self.previous_results.get(&goal_id);
                    let alerts = self.evaluator.check_alerts(
                        &result,
                        previous,
                        goal.deadline,
                        &goal.alert_thresholds,
                    );

                    // Store result for next comparison
                    self.previous_results.insert(goal_id, result);

                    updates.push(GoalUpdate {
                        goal_id,
                        old_value,
                        new_value,
                        evaluated_at: Utc::now(),
                        alerts,
                    });
                }
            }
        }

        updates
    }

    /// Force flush all pending updates (ignoring debounce)
    pub fn flush_all(&mut self) -> Vec<GoalUpdate> {
        let all_ids: Vec<Uuid> = self.pending_updates.keys().copied().collect();
        let mut updates = Vec::new();

        for goal_id in all_ids {
            if let Some(pending) = self.pending_updates.remove(&goal_id) {
                if let Some(goal) = self.goals.get_mut(&goal_id) {
                    let old_value = goal.current;
                    goal.current += pending.increment;
                    let new_value = goal.current;

                    let result = self.evaluator.evaluate_volume(
                        goal_id,
                        new_value as u64,
                        goal.target as u64,
                    );

                    let previous = self.previous_results.get(&goal_id);
                    let alerts = self.evaluator.check_alerts(
                        &result,
                        previous,
                        goal.deadline,
                        &goal.alert_thresholds,
                    );

                    self.previous_results.insert(goal_id, result);

                    updates.push(GoalUpdate {
                        goal_id,
                        old_value,
                        new_value,
                        evaluated_at: Utc::now(),
                        alerts,
                    });
                }
            }
        }

        updates
    }

    /// Get completion actions for a goal
    #[must_use]
    pub fn get_completion_actions(&self, goal_id: Uuid) -> Option<&[CompletionAction]> {
        self.completion_actions.get(&goal_id).map(Vec::as_slice)
    }

    /// Process completion actions for a goal
    pub async fn process_completion(&self, goal_id: Uuid) -> Vec<ActionResult> {
        let actions = match self.completion_actions.get(&goal_id) {
            Some(actions) => actions.clone(),
            None => return Vec::new(),
        };

        let mut results = Vec::new();

        for action in actions {
            let result = execute_action(&action).await;
            results.push(result);
        }

        results
    }

    /// Get a goal by ID
    #[must_use]
    pub fn get_goal(&self, goal_id: Uuid) -> Option<&TrackedGoal> {
        self.goals.get(&goal_id)
    }

    /// Get all tracked goals
    #[must_use]
    pub fn all_goals(&self) -> &HashMap<Uuid, TrackedGoal> {
        &self.goals
    }

    /// Check if a goal is complete
    #[must_use]
    pub fn is_goal_complete(&self, goal_id: Uuid) -> bool {
        self.goals
            .get(&goal_id)
            .map(|g| g.current >= g.target)
            .unwrap_or(false)
    }
}

/// Execute a single completion action
async fn execute_action(action: &CompletionAction) -> ActionResult {
    // In a real implementation, these would actually perform the actions
    let (success, error) = match action {
        CompletionAction::Notify { recipients } => {
            // Would send notifications
            tracing::info!("Would notify: {:?}", recipients);
            (true, None)
        }
        CompletionAction::Pause => {
            // Would pause project
            tracing::info!("Would pause project");
            (true, None)
        }
        CompletionAction::TriggerWebhook { url } => {
            // Would call webhook
            tracing::info!("Would trigger webhook: {}", url);
            (true, None)
        }
        CompletionAction::Archive => {
            // Would archive project
            tracing::info!("Would archive project");
            (true, None)
        }
        CompletionAction::Custom { action_type, .. } => {
            tracing::info!("Would execute custom action: {}", action_type);
            (true, None)
        }
    };

    ActionResult {
        action: action.clone(),
        success,
        error,
        executed_at: Utc::now(),
    }
}

/// Spawn a background task that flushes pending updates periodically
pub fn spawn_flush_loop(tracker: Arc<Mutex<GoalTracker>>) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(DEBOUNCE_DURATION);

        loop {
            interval.tick().await;

            let updates = {
                let mut tracker = tracker.lock().await;
                tracker.flush_pending()
            };

            // Process any completed goals
            for update in &updates {
                let is_complete = {
                    let tracker_guard = tracker.lock().await;
                    tracker_guard.is_goal_complete(update.goal_id)
                };

                if is_complete {
                    let tracker_guard = tracker.lock().await;
                    let _results = tracker_guard.process_completion(update.goal_id).await;
                }
            }

            if !updates.is_empty() {
                tracing::debug!("Flushed {} goal updates", updates.len());
            }
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_and_contribute() {
        let mut tracker = GoalTracker::with_debounce(Duration::from_millis(10));

        let goal = TrackedGoal {
            goal_id: Uuid::new_v4(),
            name: "Test Goal".to_string(),
            target: 100.0,
            current: 0.0,
            deadline: None,
            alert_thresholds: vec![0.5],
        };

        tracker.register_goal(goal.clone(), vec![]);
        tracker.record_contribution(goal.goal_id, 10.0);
        tracker.record_contribution(goal.goal_id, 15.0);

        // Should accumulate
        assert!(tracker.pending_updates.contains_key(&goal.goal_id));
    }

    #[test]
    fn test_flush_all() {
        let mut tracker = GoalTracker::new();

        let goal = TrackedGoal {
            goal_id: Uuid::new_v4(),
            name: "Test Goal".to_string(),
            target: 100.0,
            current: 0.0,
            deadline: None,
            alert_thresholds: vec![],
        };

        let goal_id = goal.goal_id;
        tracker.register_goal(goal, vec![]);
        tracker.record_contribution(goal_id, 50.0);

        let updates = tracker.flush_all();

        assert_eq!(updates.len(), 1);
        assert_eq!(updates[0].new_value, 50.0);
        assert!(tracker.get_goal(goal_id).unwrap().current == 50.0);
    }

    #[test]
    fn test_completion_detection() {
        let mut tracker = GoalTracker::new();

        let goal = TrackedGoal {
            goal_id: Uuid::new_v4(),
            name: "Test Goal".to_string(),
            target: 100.0,
            current: 90.0,
            deadline: None,
            alert_thresholds: vec![],
        };

        let goal_id = goal.goal_id;
        tracker.register_goal(goal, vec![CompletionAction::Pause]);

        assert!(!tracker.is_goal_complete(goal_id));

        tracker.record_contribution(goal_id, 15.0);
        tracker.flush_all();

        assert!(tracker.is_goal_complete(goal_id));
    }

    #[test]
    fn test_threshold_alerts() {
        let mut tracker = GoalTracker::new();

        let goal = TrackedGoal {
            goal_id: Uuid::new_v4(),
            name: "Test Goal".to_string(),
            target: 100.0,
            current: 40.0,
            deadline: None,
            alert_thresholds: vec![0.5],
        };

        let goal_id = goal.goal_id;
        tracker.register_goal(goal, vec![]);

        // First update to establish baseline
        tracker.record_contribution(goal_id, 0.0);
        tracker.flush_all();

        // Second update crosses 50% threshold
        tracker.record_contribution(goal_id, 20.0);
        let updates = tracker.flush_all();

        assert_eq!(updates.len(), 1);
        assert!(!updates[0].alerts.is_empty());
    }
}
