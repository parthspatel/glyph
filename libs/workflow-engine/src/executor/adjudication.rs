//! Adjudication step executor
//!
//! Resolves disagreements between annotators by having an adjudicator
//! make the final decision.

use async_trait::async_trait;

use glyph_domain::enums::StepType;

use crate::config::StepConfig;
use crate::state::StepResult;

use super::traits::{ExecutionContext, ExecutionResult, ExecutorError, StepExecutor};

/// Executor for adjudication steps
pub struct AdjudicationStepExecutor {
    /// Roles required to adjudicate
    required_roles: Vec<String>,

    /// Whether to show all previous annotations
    show_all_annotations: bool,
}

impl AdjudicationStepExecutor {
    /// Create a new adjudication step executor
    pub fn new(config: &StepConfig) -> Result<Self, ExecutorError> {
        let required_roles = config
            .settings
            .required_roles
            .clone()
            .unwrap_or_else(|| vec!["adjudicator".to_string()]);

        let show_all_annotations = config.settings.show_previous.unwrap_or(true);

        Ok(Self {
            required_roles,
            show_all_annotations,
        })
    }

    /// Check if user has required role for adjudication
    #[must_use]
    pub fn user_can_adjudicate(&self, user_roles: &[String]) -> bool {
        if self.required_roles.is_empty() {
            return true;
        }

        self.required_roles
            .iter()
            .any(|required| user_roles.contains(required))
    }

    /// Whether all annotations should be visible
    #[must_use]
    pub fn should_show_all_annotations(&self) -> bool {
        self.show_all_annotations
    }
}

#[async_trait]
impl StepExecutor for AdjudicationStepExecutor {
    async fn execute(&self, ctx: &ExecutionContext<'_>) -> Result<ExecutionResult, ExecutorError> {
        // Check if adjudication decision has been submitted
        // An adjudication is a special annotation with the final decision
        let adjudication = ctx.annotations.iter().find(|a| {
            // Adjudication annotations typically have an "adjudication" field
            a.data.get("adjudication").is_some() || a.data.get("final_decision").is_some()
        });

        match adjudication {
            Some(adj) => {
                // Extract the resolved annotation and agreement info
                let agreement = adj
                    .data
                    .get("agreement")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(1.0);

                Ok(ExecutionResult::complete(StepResult::consensus(
                    agreement,
                    "adjudication",
                )))
            }
            None => Ok(ExecutionResult::waiting("Waiting for adjudicator decision")),
        }
    }

    fn step_type(&self) -> StepType {
        StepType::Adjudication
    }

    fn can_execute(&self, ctx: &ExecutionContext<'_>) -> bool {
        // Must be active AND user must have required role
        let is_active = ctx
            .workflow_state
            .get_step_state(&ctx.step_id)
            .map(|s| s.is_active())
            .unwrap_or(false);

        is_active && self.user_can_adjudicate(&ctx.current_user_roles)
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

    fn create_adjudication_annotation(agreement: f64) -> AnnotationData {
        AnnotationData {
            annotation_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            data: serde_json::json!({
                "adjudication": true,
                "agreement": agreement,
                "final_decision": {"label": "correct"}
            }),
            submitted_at: Utc::now(),
            decision: None,
        }
    }

    #[tokio::test]
    async fn test_waiting_for_adjudication() {
        let config = StepConfig {
            id: "adjudicate".to_string(),
            name: "Adjudicate".to_string(),
            step_type: StepType::Adjudication,
            settings: StepSettingsConfig::default(),
            ref_name: None,
            overrides: None,
        };

        let executor = AdjudicationStepExecutor::new(&config).unwrap();
        let state = WorkflowStateManager::new("adjudicate", &["adjudicate"]);
        let ctx = ExecutionContext::new(Uuid::new_v4(), "adjudicate".to_string(), &config, &state);

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_waiting());
    }

    #[tokio::test]
    async fn test_adjudication_complete() {
        let config = StepConfig {
            id: "adjudicate".to_string(),
            name: "Adjudicate".to_string(),
            step_type: StepType::Adjudication,
            settings: StepSettingsConfig::default(),
            ref_name: None,
            overrides: None,
        };

        let executor = AdjudicationStepExecutor::new(&config).unwrap();
        let state = WorkflowStateManager::new("adjudicate", &["adjudicate"]);
        let mut ctx =
            ExecutionContext::new(Uuid::new_v4(), "adjudicate".to_string(), &config, &state);
        ctx.annotations = vec![create_adjudication_annotation(0.85)];

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_complete());
    }

    #[test]
    fn test_role_check() {
        let config = StepConfig {
            id: "adjudicate".to_string(),
            name: "Adjudicate".to_string(),
            step_type: StepType::Adjudication,
            settings: StepSettingsConfig {
                required_roles: Some(vec!["adjudicator".to_string(), "admin".to_string()]),
                ..Default::default()
            },
            ref_name: None,
            overrides: None,
        };

        let executor = AdjudicationStepExecutor::new(&config).unwrap();

        assert!(executor.user_can_adjudicate(&["adjudicator".to_string()]));
        assert!(executor.user_can_adjudicate(&["admin".to_string()]));
        assert!(!executor.user_can_adjudicate(&["annotator".to_string()]));
    }
}
