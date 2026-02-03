//! Sub-workflow step executor
//!
//! Executes nested workflows with context isolation and recursion depth limiting.
//! Per RESEARCH.md: maximum recursion depth of 3.

use std::collections::HashMap;

use async_trait::async_trait;

use glyph_domain::enums::StepType;

use crate::config::StepConfig;
use crate::state::StepResult;

use super::traits::{ExecutionContext, ExecutionResult, ExecutorError, StepExecutor};

/// Maximum sub-workflow recursion depth per RESEARCH.md
pub const MAX_RECURSION_DEPTH: u8 = 3;

/// Executor for sub-workflow steps
pub struct SubWorkflowStepExecutor {
    /// ID of the sub-workflow to execute
    sub_workflow_id: String,

    /// Mapping from parent context fields to sub-workflow input
    input_mapping: HashMap<String, String>,

    /// Mapping from sub-workflow output to parent context fields
    output_mapping: HashMap<String, String>,

    /// Current recursion depth
    current_depth: u8,
}

impl SubWorkflowStepExecutor {
    /// Create a new sub-workflow step executor
    pub fn new(config: &StepConfig, depth: u8) -> Result<Self, ExecutorError> {
        // Check recursion depth
        if depth >= MAX_RECURSION_DEPTH {
            return Err(ExecutorError::MaxRecursionDepth {
                max: MAX_RECURSION_DEPTH,
            });
        }

        let sub_workflow_id = config.settings.sub_workflow_id.clone().ok_or_else(|| {
            ExecutorError::ConfigurationError("Missing sub_workflow_id".to_string())
        })?;

        // Parse mappings from overrides
        let overrides = config.overrides.as_ref();

        let input_mapping = overrides
            .and_then(|o| o.get("input_mapping"))
            .and_then(|v| parse_mapping(v))
            .unwrap_or_default();

        let output_mapping = overrides
            .and_then(|o| o.get("output_mapping"))
            .and_then(|v| parse_mapping(v))
            .unwrap_or_default();

        Ok(Self {
            sub_workflow_id,
            input_mapping,
            output_mapping,
            current_depth: depth,
        })
    }

    /// Get the sub-workflow ID
    #[must_use]
    pub fn sub_workflow_id(&self) -> &str {
        &self.sub_workflow_id
    }

    /// Get the current recursion depth
    #[must_use]
    pub fn depth(&self) -> u8 {
        self.current_depth
    }

    /// Map parent context to sub-workflow input
    #[must_use]
    pub fn map_input(&self, parent_context: &serde_json::Value) -> serde_json::Value {
        map_context(&self.input_mapping, parent_context)
    }

    /// Map sub-workflow output to parent context update
    #[must_use]
    pub fn map_output(&self, sub_output: &serde_json::Value) -> serde_json::Value {
        map_context(&self.output_mapping, sub_output)
    }
}

#[async_trait]
impl StepExecutor for SubWorkflowStepExecutor {
    async fn execute(&self, ctx: &ExecutionContext<'_>) -> Result<ExecutionResult, ExecutorError> {
        // Check if sub-workflow state exists in context
        let sub_state = ctx.workflow_state.get_context().get("_sub_workflow_state");

        match sub_state {
            None => {
                // Sub-workflow not started yet
                // In a real implementation, this would:
                // 1. Load the sub-workflow config
                // 2. Create initial state with mapped context
                // 3. Store state in context
                // 4. Return Waiting

                // For now, we just indicate it needs to be started
                Ok(ExecutionResult::waiting(format!(
                    "Sub-workflow '{}' needs to be started (depth: {})",
                    self.sub_workflow_id, self.current_depth
                )))
            }
            Some(state) => {
                // Check if sub-workflow is complete
                let is_complete = state
                    .get("is_complete")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                if !is_complete {
                    return Ok(ExecutionResult::waiting("Sub-workflow in progress"));
                }

                // Sub-workflow completed - extract output
                let output = state
                    .get("output")
                    .cloned()
                    .unwrap_or_else(|| serde_json::json!({}));

                // Map output to parent context
                let mapped_output = self.map_output(&output);

                Ok(ExecutionResult::complete(
                    StepResult::SubWorkflowCompleted {
                        output: mapped_output,
                    },
                ))
            }
        }
    }

    fn step_type(&self) -> StepType {
        StepType::SubWorkflow
    }
}

/// Parse a field mapping from JSON
fn parse_mapping(value: &serde_json::Value) -> Option<HashMap<String, String>> {
    value.as_object().map(|obj| {
        obj.iter()
            .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
            .collect()
    })
}

/// Map context fields according to a mapping
fn map_context(mapping: &HashMap<String, String>, source: &serde_json::Value) -> serde_json::Value {
    if mapping.is_empty() {
        // No mapping - pass through entire context
        return source.clone();
    }

    let mut result = serde_json::Map::new();

    for (source_key, target_key) in mapping {
        if let Some(value) = get_nested_value(source, source_key) {
            set_nested_value(&mut result, target_key, value.clone());
        }
    }

    serde_json::Value::Object(result)
}

/// Get a nested value using dot notation (e.g., "foo.bar.baz")
fn get_nested_value<'a>(obj: &'a serde_json::Value, path: &str) -> Option<&'a serde_json::Value> {
    let mut current = obj;
    for part in path.split('.') {
        current = current.get(part)?;
    }
    Some(current)
}

/// Set a nested value using dot notation
fn set_nested_value(
    obj: &mut serde_json::Map<String, serde_json::Value>,
    path: &str,
    value: serde_json::Value,
) {
    let parts: Vec<&str> = path.split('.').collect();

    if parts.len() == 1 {
        obj.insert(parts[0].to_string(), value);
        return;
    }

    // Create nested structure
    let mut current = obj;
    for part in &parts[..parts.len() - 1] {
        let entry = current
            .entry((*part).to_string())
            .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));

        if let serde_json::Value::Object(ref mut inner) = entry {
            current = inner;
        } else {
            return; // Can't nest into non-object
        }
    }

    current.insert(parts[parts.len() - 1].to_string(), value);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::StepSettingsConfig;
    use crate::state::WorkflowStateManager;
    use uuid::Uuid;

    #[test]
    fn test_max_depth_exceeded() {
        let config = StepConfig {
            id: "sub".to_string(),
            name: "Sub Workflow".to_string(),
            step_type: StepType::SubWorkflow,
            settings: StepSettingsConfig {
                sub_workflow_id: Some("child".to_string()),
                ..Default::default()
            },
            ref_name: None,
            overrides: None,
        };

        let result = SubWorkflowStepExecutor::new(&config, MAX_RECURSION_DEPTH);
        assert!(matches!(
            result,
            Err(ExecutorError::MaxRecursionDepth { .. })
        ));
    }

    #[test]
    fn test_context_mapping() {
        let mut mapping = HashMap::new();
        mapping.insert("parent_field".to_string(), "child_field".to_string());

        let source = serde_json::json!({
            "parent_field": "value",
            "other": "ignored"
        });

        let result = map_context(&mapping, &source);
        assert_eq!(result["child_field"], "value");
        assert!(result.get("other").is_none());
    }

    #[tokio::test]
    async fn test_sub_workflow_waiting() {
        let config = StepConfig {
            id: "sub".to_string(),
            name: "Sub Workflow".to_string(),
            step_type: StepType::SubWorkflow,
            settings: StepSettingsConfig {
                sub_workflow_id: Some("child".to_string()),
                ..Default::default()
            },
            ref_name: None,
            overrides: None,
        };

        let executor = SubWorkflowStepExecutor::new(&config, 0).unwrap();
        let state = WorkflowStateManager::new("sub", &["sub"]);
        let ctx = ExecutionContext::new(Uuid::new_v4(), "sub".to_string(), &config, &state);

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_waiting());
    }

    #[tokio::test]
    async fn test_sub_workflow_complete() {
        let config = StepConfig {
            id: "sub".to_string(),
            name: "Sub Workflow".to_string(),
            step_type: StepType::SubWorkflow,
            settings: StepSettingsConfig {
                sub_workflow_id: Some("child".to_string()),
                ..Default::default()
            },
            ref_name: None,
            overrides: None,
        };

        let executor = SubWorkflowStepExecutor::new(&config, 0).unwrap();
        let mut state = WorkflowStateManager::new("sub", &["sub"]);

        // Simulate completed sub-workflow
        state.set_context(
            "_sub_workflow_state",
            serde_json::json!({
                "is_complete": true,
                "output": {"result": "success"}
            }),
        );

        let ctx = ExecutionContext::new(Uuid::new_v4(), "sub".to_string(), &config, &state);

        let result = executor.execute(&ctx).await.unwrap();
        assert!(result.is_complete());
    }
}
