//! Review step executor
//!
//! Handles review decisions (approve/reject) on submitted work.

use async_trait::async_trait;

use glyph_domain::enums::StepType;

use crate::config::StepConfig;
use crate::state::StepResult;

use super::traits::{
    ExecutionContext, ExecutionResult, ExecutorError, ReviewDecision, StepExecutor,
};

/// Executor for review steps
pub struct ReviewStepExecutor {
    /// Whether to show previous annotations to reviewer
    show_previous: bool,
}

impl ReviewStepExecutor {
    /// Create a new review step executor
    pub fn new(config: &StepConfig) -> Result<Self, ExecutorError> {
        let show_previous = config.settings.show_previous.unwrap_or(true);

        Ok(Self { show_previous })
    }

    /// Check if review should show previous annotations
    #[must_use]
    pub fn should_show_previous(&self) -> bool {
        self.show_previous
    }
}

#[async_trait]
impl StepExecutor for ReviewStepExecutor {
    async fn execute(&self, ctx: &ExecutionContext<'_>) -> Result<ExecutionResult, ExecutorError> {
        // Find the review decision in annotations
        let decision = ctx.annotations.iter().find_map(|a| a.decision);

        match decision {
            Some(ReviewDecision::Approved) => Ok(ExecutionResult::complete(StepResult::approved())),
            Some(ReviewDecision::Rejected) => {
                // Extract rejection reason from annotation data
                let reason = ctx
                    .annotations
                    .iter()
                    .find(|a| a.decision == Some(ReviewDecision::Rejected))
                    .and_then(|a| a.data.get("reason").and_then(|v| v.as_str()))
                    .unwrap_or("No reason provided")
                    .to_string();

                Ok(ExecutionResult::complete(StepResult::rejected(reason)))
            }
            Some(ReviewDecision::NeedsRevision) => {
                let reason = ctx
                    .annotations
                    .iter()
                    .find(|a| a.decision == Some(ReviewDecision::NeedsRevision))
                    .and_then(|a| a.data.get("reason").and_then(|v| v.as_str()))
                    .unwrap_or("Needs revision")
                    .to_string();

                Ok(ExecutionResult::complete(StepResult::rejected(reason)))
            }
            None => Ok(ExecutionResult::waiting("Waiting for review decision")),
        }
    }

    fn step_type(&self) -> StepType {
        StepType::Review
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::StepSettingsConfig;
    use crate::state::WorkflowStateManager;
    use chrono::Utc;
    use uuid::Uuid;

    use super::super::traits::AnnotationData;

    fn create_review_annotation(decision: ReviewDecision, reason: Option<&str>) -> AnnotationData {
        let mut data = serde_json::Map::new();
        if let Some(r) = reason {
            data.insert("reason".to_string(), serde_json::json!(r));
        }

        AnnotationData {
            annotation_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            data: serde_json::Value::Object(data),
            submitted_at: Utc::now(),
            decision: Some(decision),
        }
    }

    #[tokio::test]
    async fn test_waiting_for_review() {
        let config = StepConfig {
            id: "review".to_string(),
            name: "Review".to_string(),
            step_type: StepType::Review,
            settings: StepSettingsConfig::default(),
            ref_name: None,
            overrides: None,
        };

        let executor = ReviewStepExecutor::new(&config).unwrap();
        let state = WorkflowStateManager::new("review", &["review"]);
        let ctx = ExecutionContext::new(Uuid::new_v4(), "review".to_string(), &config, &state);

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_waiting());
    }

    #[tokio::test]
    async fn test_approved_review() {
        let config = StepConfig {
            id: "review".to_string(),
            name: "Review".to_string(),
            step_type: StepType::Review,
            settings: StepSettingsConfig::default(),
            ref_name: None,
            overrides: None,
        };

        let executor = ReviewStepExecutor::new(&config).unwrap();
        let state = WorkflowStateManager::new("review", &["review"]);
        let mut ctx = ExecutionContext::new(Uuid::new_v4(), "review".to_string(), &config, &state);
        ctx.annotations = vec![create_review_annotation(ReviewDecision::Approved, None)];

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_complete());
        if let ExecutionResult::Complete { result } = result {
            assert!(matches!(result, StepResult::Approved));
        }
    }

    #[tokio::test]
    async fn test_rejected_review() {
        let config = StepConfig {
            id: "review".to_string(),
            name: "Review".to_string(),
            step_type: StepType::Review,
            settings: StepSettingsConfig::default(),
            ref_name: None,
            overrides: None,
        };

        let executor = ReviewStepExecutor::new(&config).unwrap();
        let state = WorkflowStateManager::new("review", &["review"]);
        let mut ctx = ExecutionContext::new(Uuid::new_v4(), "review".to_string(), &config, &state);
        ctx.annotations = vec![create_review_annotation(
            ReviewDecision::Rejected,
            Some("Poor quality"),
        )];

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_complete());
        if let ExecutionResult::Complete {
            result: StepResult::Rejected { reason },
        } = result
        {
            assert_eq!(reason, "Poor quality");
        } else {
            panic!("Expected rejected result");
        }
    }
}
