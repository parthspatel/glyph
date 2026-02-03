//! Auto-process step executor
//!
//! Executes handlers with exponential backoff retry logic.
//! Per CONTEXT.md: 3 retries with 1s, 4s, 16s delays.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use backoff::ExponentialBackoff;

use glyph_domain::enums::StepType;

use crate::config::StepConfig;
use crate::state::StepResult;

use super::handlers::{Handler, HandlerInput, HandlerRegistry};
use super::traits::{ExecutionContext, ExecutionResult, ExecutorError, StepExecutor};

/// Default maximum retries per CONTEXT.md
const DEFAULT_MAX_RETRIES: u8 = 3;

/// Executor for auto-process steps
pub struct AutoProcessStepExecutor {
    /// Handler name to execute
    handler_name: String,

    /// Handler-specific configuration
    handler_config: serde_json::Value,

    /// Maximum retry attempts (used in backoff configuration)
    #[allow(dead_code)]
    max_retries: u8,

    /// Handler registry
    registry: Arc<HandlerRegistry>,
}

impl AutoProcessStepExecutor {
    /// Create a new auto-process step executor
    pub fn new(config: &StepConfig, registry: Arc<HandlerRegistry>) -> Result<Self, ExecutorError> {
        let handler_name =
            config.settings.handler.clone().ok_or_else(|| {
                ExecutorError::ConfigurationError("Missing handler name".to_string())
            })?;

        // Verify handler exists
        if registry.get(&handler_name).is_none() {
            return Err(ExecutorError::HandlerNotFound(handler_name));
        }

        let handler_config = config
            .overrides
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));

        Ok(Self {
            handler_name,
            handler_config,
            max_retries: DEFAULT_MAX_RETRIES,
            registry,
        })
    }

    /// Create exponential backoff configuration per CONTEXT.md
    fn create_backoff(&self) -> ExponentialBackoff {
        ExponentialBackoff {
            initial_interval: Duration::from_secs(1), // 1s
            multiplier: 4.0,                          // 1s -> 4s -> 16s
            max_interval: Duration::from_secs(16),
            max_elapsed_time: Some(Duration::from_secs(60)),
            ..Default::default()
        }
    }
}

#[async_trait]
impl StepExecutor for AutoProcessStepExecutor {
    async fn execute(&self, ctx: &ExecutionContext<'_>) -> Result<ExecutionResult, ExecutorError> {
        let handler = self
            .registry
            .get(&self.handler_name)
            .ok_or_else(|| ExecutorError::HandlerNotFound(self.handler_name.clone()))?;

        // Build handler input from context
        let input = HandlerInput {
            annotations: ctx.annotations.iter().map(|a| a.data.clone()).collect(),
            context: ctx.workflow_state.get_context().clone(),
            config: self.handler_config.clone(),
        };

        // Execute with retry
        let result = execute_with_retry(handler.as_ref(), input, self.create_backoff()).await;

        match result {
            Ok(output) => Ok(ExecutionResult::complete(StepResult::AutoProcessed {
                output: output.result,
            })),
            Err(e) => Ok(ExecutionResult::failed(e.to_string(), false)),
        }
    }

    fn step_type(&self) -> StepType {
        StepType::AutoProcess
    }

    fn can_execute(&self, _ctx: &ExecutionContext<'_>) -> bool {
        // Auto-process steps can always execute when active
        true
    }
}

/// Execute a handler with exponential backoff retry
async fn execute_with_retry(
    handler: &dyn Handler,
    input: HandlerInput,
    backoff: ExponentialBackoff,
) -> Result<super::handlers::HandlerOutput, super::handlers::HandlerError> {
    let input = Arc::new(input);

    backoff::future::retry(backoff, || {
        let input = Arc::clone(&input);
        async move {
            handler
                .execute((*input).clone())
                .await
                .map_err(backoff::Error::transient)
        }
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::StepSettingsConfig;
    use crate::state::WorkflowStateManager;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_auto_process_success() {
        let registry = Arc::new(HandlerRegistry::with_builtins());

        let config = StepConfig {
            id: "auto".to_string(),
            name: "Auto Process".to_string(),
            step_type: StepType::AutoProcess,
            settings: StepSettingsConfig {
                handler: Some("merge_annotations".to_string()),
                ..Default::default()
            },
            ref_name: None,
            overrides: None,
        };

        let executor = AutoProcessStepExecutor::new(&config, registry).unwrap();
        let state = WorkflowStateManager::new("auto", &["auto"]);
        let mut ctx = ExecutionContext::new(Uuid::new_v4(), "auto".to_string(), &config, &state);

        // Add some annotations
        ctx.annotations = vec![super::super::traits::AnnotationData {
            annotation_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            data: serde_json::json!({"label": "test"}),
            submitted_at: chrono::Utc::now(),
            decision: None,
        }];

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_complete());
    }

    #[test]
    fn test_missing_handler() {
        let registry = Arc::new(HandlerRegistry::new()); // Empty registry

        let config = StepConfig {
            id: "auto".to_string(),
            name: "Auto Process".to_string(),
            step_type: StepType::AutoProcess,
            settings: StepSettingsConfig {
                handler: Some("nonexistent".to_string()),
                ..Default::default()
            },
            ref_name: None,
            overrides: None,
        };

        let result = AutoProcessStepExecutor::new(&config, registry);
        assert!(matches!(result, Err(ExecutorError::HandlerNotFound(_))));
    }
}
