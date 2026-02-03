//! Conditional step executor
//!
//! Evaluates expressions to determine which branch to take.

use async_trait::async_trait;

use glyph_domain::enums::StepType;

use crate::config::{StepConfig, TransitionConditionConfig};
use crate::state::StepResult;
use crate::transition::{evaluate_condition, ConditionContext};

use super::traits::{ExecutionContext, ExecutionResult, ExecutorError, StepExecutor};

/// Executor for conditional steps
pub struct ConditionalStepExecutor {
    /// Condition expression to evaluate
    condition: String,

    /// Step ID to transition to if condition is true
    true_branch: String,

    /// Step ID to transition to if condition is false
    false_branch: String,
}

impl ConditionalStepExecutor {
    /// Create a new conditional step executor
    pub fn new(config: &StepConfig) -> Result<Self, ExecutorError> {
        let condition =
            config.settings.condition.clone().ok_or_else(|| {
                ExecutorError::ConfigurationError("Missing condition".to_string())
            })?;

        // Extract branch targets from overrides or use defaults
        let overrides = config.overrides.as_ref();

        let true_branch = overrides
            .and_then(|o| o.get("true_branch").and_then(|v| v.as_str()))
            .unwrap_or("_complete")
            .to_string();

        let false_branch = overrides
            .and_then(|o| o.get("false_branch").and_then(|v| v.as_str()))
            .unwrap_or("_failed")
            .to_string();

        Ok(Self {
            condition,
            true_branch,
            false_branch,
        })
    }

    /// Get the condition expression
    #[must_use]
    pub fn condition(&self) -> &str {
        &self.condition
    }

    /// Get the true branch target
    #[must_use]
    pub fn true_branch(&self) -> &str {
        &self.true_branch
    }

    /// Get the false branch target
    #[must_use]
    pub fn false_branch(&self) -> &str {
        &self.false_branch
    }
}

#[async_trait]
impl StepExecutor for ConditionalStepExecutor {
    async fn execute(&self, ctx: &ExecutionContext<'_>) -> Result<ExecutionResult, ExecutorError> {
        // Build condition for evaluation
        let condition_config = TransitionConditionConfig {
            condition_type: "expression".to_string(),
            expression: Some(self.condition.clone()),
            threshold: None,
        };

        // Build context for condition evaluation
        let condition_ctx = ConditionContext::new(
            None, // No step result for conditional
            None, // Consensus from context if needed
            ctx.workflow_state.get_context(),
            ctx.workflow_state.all_step_states(),
        );

        // Evaluate the condition
        let result = evaluate_condition(&condition_config, &condition_ctx)
            .map_err(|e| ExecutorError::ExecutionFailed(e.to_string()))?;

        let branch = if result {
            self.true_branch.clone()
        } else {
            self.false_branch.clone()
        };

        Ok(ExecutionResult::complete(StepResult::ConditionMet {
            branch,
        }))
    }

    fn step_type(&self) -> StepType {
        StepType::Conditional
    }

    fn can_execute(&self, _ctx: &ExecutionContext<'_>) -> bool {
        // Conditional steps execute immediately
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::StepSettingsConfig;
    use crate::state::WorkflowStateManager;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_condition_true() {
        let config = StepConfig {
            id: "cond".to_string(),
            name: "Conditional".to_string(),
            step_type: StepType::Conditional,
            settings: StepSettingsConfig {
                condition: Some("agreement >= 0.5".to_string()),
                ..Default::default()
            },
            ref_name: None,
            overrides: Some(serde_json::json!({
                "true_branch": "approved",
                "false_branch": "rejected"
            })),
        };

        let executor = ConditionalStepExecutor::new(&config).unwrap();

        // Create state with agreement in context
        let mut state = WorkflowStateManager::new("cond", &["cond", "approved", "rejected"]);
        state.set_context("agreement", serde_json::json!(0.8));

        let ctx = ExecutionContext::new(Uuid::new_v4(), "cond".to_string(), &config, &state);

        let result = executor.execute(&ctx).await.unwrap();

        if let ExecutionResult::Complete {
            result: StepResult::ConditionMet { branch },
        } = result
        {
            assert_eq!(branch, "approved");
        } else {
            panic!("Expected ConditionMet result");
        }
    }

    #[tokio::test]
    async fn test_condition_false() {
        let config = StepConfig {
            id: "cond".to_string(),
            name: "Conditional".to_string(),
            step_type: StepType::Conditional,
            settings: StepSettingsConfig {
                condition: Some("agreement >= 0.8".to_string()),
                ..Default::default()
            },
            ref_name: None,
            overrides: Some(serde_json::json!({
                "true_branch": "approved",
                "false_branch": "rejected"
            })),
        };

        let executor = ConditionalStepExecutor::new(&config).unwrap();

        let mut state = WorkflowStateManager::new("cond", &["cond", "approved", "rejected"]);
        state.set_context("agreement", serde_json::json!(0.5)); // Below threshold

        let ctx = ExecutionContext::new(Uuid::new_v4(), "cond".to_string(), &config, &state);

        let result = executor.execute(&ctx).await.unwrap();

        if let ExecutionResult::Complete {
            result: StepResult::ConditionMet { branch },
        } = result
        {
            assert_eq!(branch, "rejected");
        } else {
            panic!("Expected ConditionMet result");
        }
    }

    #[test]
    fn test_missing_condition() {
        let config = StepConfig {
            id: "cond".to_string(),
            name: "Conditional".to_string(),
            step_type: StepType::Conditional,
            settings: StepSettingsConfig::default(), // No condition
            ref_name: None,
            overrides: None,
        };

        let result = ConditionalStepExecutor::new(&config);
        assert!(matches!(result, Err(ExecutorError::ConfigurationError(_))));
    }
}
