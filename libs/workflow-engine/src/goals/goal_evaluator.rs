//! Goal evaluation logic
//!
//! Evaluates different goal types (volume, quality, deadline, composite)
//! and calculates progress, projections, and alerts.

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// =============================================================================
// Evaluation Mode
// =============================================================================

/// Mode for evaluating goal progress
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EvaluationMode {
    /// Real-time evaluation on every update
    Realtime,

    /// Rolling window for quality metrics
    RollingWindow {
        /// Number of items in the window
        size: usize,
    },

    /// Checkpoint-based evaluation (batch processing)
    Checkpoint,
}

impl Default for EvaluationMode {
    fn default() -> Self {
        Self::Realtime
    }
}

// =============================================================================
// Evaluation Result
// =============================================================================

/// Result of evaluating a goal's progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationResult {
    /// Goal ID
    pub goal_id: Uuid,

    /// Current value
    pub current_value: f64,

    /// Target value
    pub target_value: f64,

    /// Progress percentage (0.0 to 1.0+)
    pub percentage: f64,

    /// Whether the goal is complete
    pub is_complete: bool,

    /// Projected completion time (if calculable)
    pub projected_completion: Option<DateTime<Utc>>,

    /// When this evaluation was performed
    pub evaluated_at: DateTime<Utc>,
}

impl EvaluationResult {
    /// Create a new evaluation result
    #[must_use]
    pub fn new(goal_id: Uuid, current: f64, target: f64) -> Self {
        let percentage = if target > 0.0 { current / target } else { 1.0 };

        Self {
            goal_id,
            current_value: current,
            target_value: target,
            percentage,
            is_complete: percentage >= 1.0,
            projected_completion: None,
            evaluated_at: Utc::now(),
        }
    }

    /// Set projected completion time
    pub fn with_projection(mut self, projection: Option<DateTime<Utc>>) -> Self {
        self.projected_completion = projection;
        self
    }
}

// =============================================================================
// Alert Conditions
// =============================================================================

/// Direction for threshold alerts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Direction {
    Rising,
    Falling,
}

/// Alert condition that may be triggered
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AlertCondition {
    /// A threshold was crossed
    ThresholdCrossed {
        threshold: f64,
        direction: Direction,
    },

    /// Deadline will likely be missed
    ProjectedMiss {
        deadline: DateTime<Utc>,
        projected: DateTime<Utc>,
    },

    /// Goal completed
    GoalCompleted { completed_at: DateTime<Utc> },

    /// Quality dropped below minimum
    QualityBelowMinimum { current: f64, minimum: f64 },

    /// Velocity decreased significantly
    VelocityDecreased {
        previous: f64,
        current: f64,
        decrease_percent: f64,
    },
}

// =============================================================================
// Goal Evaluator
// =============================================================================

/// Evaluates goal progress
#[derive(Debug, Clone)]
pub struct GoalEvaluator {
    /// Evaluation mode
    mode: EvaluationMode,
}

impl Default for GoalEvaluator {
    fn default() -> Self {
        Self::new()
    }
}

impl GoalEvaluator {
    /// Create a new goal evaluator
    #[must_use]
    pub fn new() -> Self {
        Self {
            mode: EvaluationMode::Realtime,
        }
    }

    /// Create evaluator with specific mode
    #[must_use]
    pub fn with_mode(mode: EvaluationMode) -> Self {
        Self { mode }
    }

    /// Evaluate a volume goal (simple count)
    #[must_use]
    pub fn evaluate_volume(
        &self,
        goal_id: Uuid,
        completed_count: u64,
        target_count: u64,
    ) -> EvaluationResult {
        EvaluationResult::new(goal_id, completed_count as f64, target_count as f64)
    }

    /// Evaluate a quality goal (average score)
    #[must_use]
    pub fn evaluate_quality(
        &self,
        goal_id: Uuid,
        scores: &[f64],
        target_quality: f64,
    ) -> EvaluationResult {
        let scores_to_use = match self.mode {
            EvaluationMode::RollingWindow { size } => {
                if scores.len() > size {
                    &scores[scores.len() - size..]
                } else {
                    scores
                }
            }
            _ => scores,
        };

        let current = if scores_to_use.is_empty() {
            0.0
        } else {
            scores_to_use.iter().sum::<f64>() / scores_to_use.len() as f64
        };

        EvaluationResult::new(goal_id, current, target_quality)
    }

    /// Evaluate a deadline goal
    #[must_use]
    pub fn evaluate_deadline(
        &self,
        goal_id: Uuid,
        current_progress: f64,
        target_progress: f64,
        deadline: DateTime<Utc>,
        velocity: Option<f64>,
    ) -> EvaluationResult {
        let now = Utc::now();
        let mut result = EvaluationResult::new(goal_id, current_progress, target_progress);

        // Calculate projected completion
        if let Some(v) = velocity {
            if v > 0.0 {
                let remaining = target_progress - current_progress;
                let time_needed_secs = (remaining / v) as i64;
                let projected = now + Duration::seconds(time_needed_secs);
                result = result.with_projection(Some(projected));

                // Mark complete if deadline passed and target met
                if now > deadline {
                    result.is_complete = current_progress >= target_progress;
                }
            }
        }

        result
    }

    /// Evaluate a composite goal (multiple sub-goals)
    #[must_use]
    pub fn evaluate_composite(
        &self,
        goal_id: Uuid,
        sub_results: &[EvaluationResult],
        require_all: bool,
    ) -> EvaluationResult {
        if sub_results.is_empty() {
            return EvaluationResult::new(goal_id, 0.0, 1.0);
        }

        let (is_complete, percentage) = if require_all {
            // AND: all must be complete
            let complete = sub_results.iter().all(|r| r.is_complete);
            let avg_pct =
                sub_results.iter().map(|r| r.percentage).sum::<f64>() / sub_results.len() as f64;
            (complete, avg_pct)
        } else {
            // OR: any complete
            let complete = sub_results.iter().any(|r| r.is_complete);
            let max_pct = sub_results.iter().map(|r| r.percentage).fold(0.0, f64::max);
            (complete, max_pct)
        };

        let mut result = EvaluationResult::new(goal_id, percentage, 1.0);
        result.is_complete = is_complete;
        result
    }

    /// Project completion time based on velocity
    #[must_use]
    pub fn project_completion(current: f64, target: f64, velocity: f64) -> Option<DateTime<Utc>> {
        if velocity <= 0.0 || current >= target {
            return None;
        }

        let remaining = target - current;
        let time_needed_secs = (remaining / velocity) as i64;

        Some(Utc::now() + Duration::seconds(time_needed_secs))
    }

    /// Check for alert conditions
    #[must_use]
    pub fn check_alerts(
        &self,
        result: &EvaluationResult,
        previous_result: Option<&EvaluationResult>,
        deadline: Option<DateTime<Utc>>,
        alert_thresholds: &[f64],
    ) -> Vec<AlertCondition> {
        let mut alerts = Vec::new();

        // Check for completion
        if result.is_complete {
            if let Some(prev) = previous_result {
                if !prev.is_complete {
                    alerts.push(AlertCondition::GoalCompleted {
                        completed_at: result.evaluated_at,
                    });
                }
            }
        }

        // Check threshold crossings
        if let Some(prev) = previous_result {
            for &threshold in alert_thresholds {
                let was_below = prev.percentage < threshold;
                let is_above = result.percentage >= threshold;
                let was_above = prev.percentage >= threshold;
                let is_below = result.percentage < threshold;

                if was_below && is_above {
                    alerts.push(AlertCondition::ThresholdCrossed {
                        threshold,
                        direction: Direction::Rising,
                    });
                } else if was_above && is_below {
                    alerts.push(AlertCondition::ThresholdCrossed {
                        threshold,
                        direction: Direction::Falling,
                    });
                }
            }
        }

        // Check deadline miss projection
        if let (Some(deadline), Some(projected)) = (deadline, result.projected_completion) {
            if projected > deadline && !result.is_complete {
                alerts.push(AlertCondition::ProjectedMiss {
                    deadline,
                    projected,
                });
            }
        }

        alerts
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_volume_evaluation() {
        let evaluator = GoalEvaluator::new();
        let result = evaluator.evaluate_volume(Uuid::new_v4(), 75, 100);

        assert!((result.percentage - 0.75).abs() < 0.001);
        assert!(!result.is_complete);
    }

    #[test]
    fn test_volume_complete() {
        let evaluator = GoalEvaluator::new();
        let result = evaluator.evaluate_volume(Uuid::new_v4(), 100, 100);

        assert!((result.percentage - 1.0).abs() < 0.001);
        assert!(result.is_complete);
    }

    #[test]
    fn test_quality_evaluation() {
        let evaluator = GoalEvaluator::new();
        let scores = vec![0.8, 0.9, 0.85, 0.95];
        let result = evaluator.evaluate_quality(Uuid::new_v4(), &scores, 0.9);

        // Average: 0.875
        assert!((result.current_value - 0.875).abs() < 0.001);
        assert!(!result.is_complete); // 0.875 < 0.9
    }

    #[test]
    fn test_rolling_window() {
        let evaluator = GoalEvaluator::with_mode(EvaluationMode::RollingWindow { size: 2 });
        let scores = vec![0.5, 0.6, 0.9, 0.95]; // Only last 2 should count
        let result = evaluator.evaluate_quality(Uuid::new_v4(), &scores, 0.9);

        // Average of [0.9, 0.95]: 0.925
        assert!((result.current_value - 0.925).abs() < 0.001);
    }

    #[test]
    fn test_composite_all_required() {
        let evaluator = GoalEvaluator::new();
        let sub_results = vec![
            EvaluationResult::new(Uuid::new_v4(), 100.0, 100.0), // Complete
            EvaluationResult::new(Uuid::new_v4(), 50.0, 100.0),  // Incomplete
        ];

        let result = evaluator.evaluate_composite(Uuid::new_v4(), &sub_results, true);
        assert!(!result.is_complete); // Not all complete
    }

    #[test]
    fn test_composite_any_required() {
        let evaluator = GoalEvaluator::new();
        let sub_results = vec![
            EvaluationResult::new(Uuid::new_v4(), 100.0, 100.0), // Complete
            EvaluationResult::new(Uuid::new_v4(), 50.0, 100.0),  // Incomplete
        ];

        let result = evaluator.evaluate_composite(Uuid::new_v4(), &sub_results, false);
        assert!(result.is_complete); // At least one complete
    }

    #[test]
    fn test_threshold_alert() {
        let evaluator = GoalEvaluator::new();
        let prev = EvaluationResult::new(Uuid::new_v4(), 40.0, 100.0);
        let current = EvaluationResult::new(Uuid::new_v4(), 60.0, 100.0);

        let alerts = evaluator.check_alerts(&current, Some(&prev), None, &[0.5]);

        assert_eq!(alerts.len(), 1);
        assert!(matches!(
            alerts[0],
            AlertCondition::ThresholdCrossed {
                direction: Direction::Rising,
                ..
            }
        ));
    }
}
