//! Annotation step executor
//!
//! Waits for the configured number of annotations to be submitted
//! before completing the step.

use async_trait::async_trait;

use glyph_domain::enums::StepType;

use crate::config::{StepConfig, Visibility};
use crate::state::StepResult;

use super::traits::{
    AnnotationData, ExecutionContext, ExecutionResult, ExecutorError, StepExecutor,
};

/// Executor for annotation steps
pub struct AnnotationStepExecutor {
    /// Minimum number of annotations required
    min_annotators: u32,

    /// Visibility mode (blind or collaborative)
    visibility: Visibility,
}

impl AnnotationStepExecutor {
    /// Create a new annotation step executor
    pub fn new(config: &StepConfig) -> Result<Self, ExecutorError> {
        let min_annotators = config.settings.min_annotators.unwrap_or(1);
        let visibility = config.settings.visibility.unwrap_or_default();

        Ok(Self {
            min_annotators,
            visibility,
        })
    }

    /// Get annotations visible to the current user based on visibility mode
    #[must_use]
    pub fn get_visible_annotations<'a>(
        &self,
        ctx: &'a ExecutionContext<'_>,
    ) -> Vec<&'a AnnotationData> {
        match self.visibility {
            Visibility::Blind => {
                // In blind mode, users can only see their own annotations
                ctx.annotations
                    .iter()
                    .filter(|a| ctx.current_user_id == Some(a.user_id))
                    .collect()
            }
            Visibility::Collaborative => {
                // In collaborative mode, all annotations are visible
                ctx.annotations.iter().collect()
            }
        }
    }
}

#[async_trait]
impl StepExecutor for AnnotationStepExecutor {
    async fn execute(&self, ctx: &ExecutionContext<'_>) -> Result<ExecutionResult, ExecutorError> {
        let annotation_count = ctx.annotations.len() as u32;

        if annotation_count < self.min_annotators {
            let remaining = self.min_annotators - annotation_count;
            return Ok(ExecutionResult::waiting(format!(
                "Waiting for {remaining} more annotation(s)"
            )));
        }

        // All required annotations received
        let annotation_ids: Vec<_> = ctx.annotations.iter().map(|a| a.annotation_id).collect();

        Ok(ExecutionResult::complete(StepResult::submitted(
            annotation_ids,
        )))
    }

    fn step_type(&self) -> StepType {
        StepType::Annotation
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::StepSettingsConfig;
    use crate::state::WorkflowStateManager;
    use chrono::Utc;
    use uuid::Uuid;

    fn create_annotation(user_id: Uuid) -> AnnotationData {
        AnnotationData {
            annotation_id: Uuid::new_v4(),
            user_id,
            data: serde_json::json!({"label": "test"}),
            submitted_at: Utc::now(),
            decision: None,
        }
    }

    #[tokio::test]
    async fn test_waiting_for_annotations() {
        let config = StepConfig {
            id: "step1".to_string(),
            name: "Annotate".to_string(),
            step_type: StepType::Annotation,
            settings: StepSettingsConfig {
                min_annotators: Some(3),
                ..Default::default()
            },
            ref_name: None,
            overrides: None,
        };

        let executor = AnnotationStepExecutor::new(&config).unwrap();
        let state = WorkflowStateManager::new("step1", &["step1"]);
        let mut ctx = ExecutionContext::new(Uuid::new_v4(), "step1".to_string(), &config, &state);

        // Only 1 annotation
        ctx.annotations = vec![create_annotation(Uuid::new_v4())];

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_waiting());
    }

    #[tokio::test]
    async fn test_complete_with_enough_annotations() {
        let config = StepConfig {
            id: "step1".to_string(),
            name: "Annotate".to_string(),
            step_type: StepType::Annotation,
            settings: StepSettingsConfig {
                min_annotators: Some(2),
                ..Default::default()
            },
            ref_name: None,
            overrides: None,
        };

        let executor = AnnotationStepExecutor::new(&config).unwrap();
        let state = WorkflowStateManager::new("step1", &["step1"]);
        let mut ctx = ExecutionContext::new(Uuid::new_v4(), "step1".to_string(), &config, &state);

        ctx.annotations = vec![
            create_annotation(Uuid::new_v4()),
            create_annotation(Uuid::new_v4()),
        ];

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_complete());
    }

    #[test]
    fn test_blind_visibility() {
        let config = StepConfig {
            id: "step1".to_string(),
            name: "Annotate".to_string(),
            step_type: StepType::Annotation,
            settings: StepSettingsConfig {
                visibility: Some(Visibility::Blind),
                ..Default::default()
            },
            ref_name: None,
            overrides: None,
        };

        let executor = AnnotationStepExecutor::new(&config).unwrap();
        let state = WorkflowStateManager::new("step1", &["step1"]);

        let user1 = Uuid::new_v4();
        let user2 = Uuid::new_v4();

        let mut ctx = ExecutionContext::new(Uuid::new_v4(), "step1".to_string(), &config, &state);
        ctx.annotations = vec![create_annotation(user1), create_annotation(user2)];
        ctx.current_user_id = Some(user1);

        let visible = executor.get_visible_annotations(&ctx);
        assert_eq!(visible.len(), 1);
        assert_eq!(visible[0].user_id, user1);
    }
}
