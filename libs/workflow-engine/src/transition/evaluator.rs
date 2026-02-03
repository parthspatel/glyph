//! Transition evaluator for workflow progression
//!
//! Determines the next step based on transition conditions and step results.

use thiserror::Error;

use crate::config::{TransitionConditionConfig, WorkflowConfig};
use crate::state::{StepResult, WorkflowStateManager};

use super::conditions::{evaluate_condition, ConditionContext, ConditionError};

// =============================================================================
// Constants
// =============================================================================

/// Terminal state for successful completion
pub const TERMINAL_COMPLETE: &str = "_complete";

/// Terminal state for failure
pub const TERMINAL_FAILED: &str = "_failed";

// =============================================================================
// Errors
// =============================================================================

/// Errors that can occur during transition evaluation
#[derive(Debug, Error)]
pub enum TransitionError {
    /// Step not found in workflow
    #[error("Step not found: {0}")]
    StepNotFound(String),

    /// No transitions match current state
    #[error("No matching transition from step '{0}'")]
    NoMatchingTransition(String),

    /// Condition evaluation failed
    #[error("Condition error: {0}")]
    ConditionError(#[from] ConditionError),

    /// Workflow is already complete
    #[error("Workflow is already complete")]
    WorkflowComplete,
}

// =============================================================================
// Transition Evaluator
// =============================================================================

/// Evaluates transitions to determine next step in workflow
pub struct TransitionEvaluator<'a> {
    /// Reference to workflow configuration
    workflow_config: &'a WorkflowConfig,
}

impl<'a> TransitionEvaluator<'a> {
    /// Create a new transition evaluator
    #[must_use]
    pub fn new(config: &'a WorkflowConfig) -> Self {
        Self {
            workflow_config: config,
        }
    }

    /// Evaluate and return the next step ID
    ///
    /// # Arguments
    /// * `current_step_id` - The step that just completed
    /// * `state` - Current workflow state
    /// * `step_result` - Result from the completed step
    /// * `consensus_agreement` - Optional agreement score
    ///
    /// # Returns
    /// * `Ok(Some(step_id))` - Next step to execute
    /// * `Ok(None)` - Workflow is complete (reached terminal state)
    /// * `Err(...)` - Evaluation failed
    pub fn evaluate_next_step(
        &self,
        current_step_id: &str,
        state: &WorkflowStateManager,
        step_result: Option<&StepResult>,
        consensus_agreement: Option<f64>,
    ) -> Result<Option<String>, TransitionError> {
        // Get all outgoing transitions from current step
        let transitions = self.get_outgoing_transitions(current_step_id);

        if transitions.is_empty() {
            return Err(TransitionError::NoMatchingTransition(
                current_step_id.to_string(),
            ));
        }

        // Build evaluation context
        let ctx = ConditionContext::new(
            step_result,
            consensus_agreement,
            state.get_context(),
            state.all_step_states(),
        );

        // Evaluate transitions in order, return first match
        for transition in transitions {
            let condition = transition.condition.as_ref();
            let should_take = match condition {
                Some(cond) => evaluate_condition(cond, &ctx)?,
                None => true, // No condition means "always"
            };

            if should_take {
                let next_step = &transition.to;

                // Check for terminal states
                if self.is_terminal_step(next_step) {
                    return Ok(None);
                }

                return Ok(Some(next_step.clone()));
            }
        }

        // No transition matched
        Err(TransitionError::NoMatchingTransition(
            current_step_id.to_string(),
        ))
    }

    /// Get all outgoing transitions from a step
    #[must_use]
    pub fn get_outgoing_transitions(&self, step_id: &str) -> Vec<&crate::config::TransitionConfig> {
        self.workflow_config
            .transitions
            .iter()
            .filter(|t| t.from == step_id)
            .collect()
    }

    /// Check if a step ID is a terminal state
    #[must_use]
    pub fn is_terminal_step(&self, step_id: &str) -> bool {
        step_id == TERMINAL_COMPLETE || step_id == TERMINAL_FAILED
    }

    /// Get the entry step (first step in configuration)
    #[must_use]
    pub fn entry_step(&self) -> Option<&str> {
        self.workflow_config.steps.first().map(|s| s.id.as_str())
    }

    /// Find all steps that can reach a terminal state
    #[must_use]
    pub fn steps_to_terminal(&self) -> Vec<&str> {
        self.workflow_config
            .transitions
            .iter()
            .filter(|t| self.is_terminal_step(&t.to))
            .map(|t| t.from.as_str())
            .collect()
    }
}

/// Evaluate a single transition condition with provided context values
///
/// This is a convenience function for simple condition evaluation.
pub fn evaluate_transition_condition(
    condition: &TransitionConditionConfig,
    step_result: Option<&StepResult>,
    consensus_agreement: Option<f64>,
) -> Result<bool, TransitionError> {
    let empty_context = serde_json::Value::Object(serde_json::Map::new());
    let empty_states = std::collections::HashMap::new();

    let ctx = ConditionContext::new(
        step_result,
        consensus_agreement,
        &empty_context,
        &empty_states,
    );

    Ok(evaluate_condition(condition, &ctx)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{
        StepConfig, StepSettingsConfig, TransitionConditionConfig, TransitionConfig,
        WorkflowSettingsConfig,
    };
    use glyph_domain::enums::{StepType, WorkflowType};

    fn simple_workflow() -> WorkflowConfig {
        WorkflowConfig {
            version: "1.0".to_string(),
            name: "Test".to_string(),
            workflow_type: WorkflowType::Single,
            settings: WorkflowSettingsConfig::default(),
            steps: vec![
                StepConfig {
                    id: "annotate".to_string(),
                    name: "Annotate".to_string(),
                    step_type: StepType::Annotation,
                    settings: StepSettingsConfig::default(),
                    ref_name: None,
                    overrides: None,
                },
                StepConfig {
                    id: "review".to_string(),
                    name: "Review".to_string(),
                    step_type: StepType::Review,
                    settings: StepSettingsConfig::default(),
                    ref_name: None,
                    overrides: None,
                },
            ],
            transitions: vec![
                TransitionConfig {
                    from: "annotate".to_string(),
                    to: "review".to_string(),
                    condition: None,
                },
                TransitionConfig {
                    from: "review".to_string(),
                    to: "_complete".to_string(),
                    condition: Some(TransitionConditionConfig {
                        condition_type: "on_approved".to_string(),
                        expression: None,
                        threshold: None,
                    }),
                },
                TransitionConfig {
                    from: "review".to_string(),
                    to: "annotate".to_string(),
                    condition: Some(TransitionConditionConfig {
                        condition_type: "on_rejected".to_string(),
                        expression: None,
                        threshold: None,
                    }),
                },
            ],
            step_library: vec![],
        }
    }

    #[test]
    fn test_simple_transition() {
        let config = simple_workflow();
        let evaluator = TransitionEvaluator::new(&config);
        let state = WorkflowStateManager::new("annotate", &["annotate", "review"]);

        let next = evaluator
            .evaluate_next_step("annotate", &state, None, None)
            .unwrap();

        assert_eq!(next, Some("review".to_string()));
    }

    #[test]
    fn test_conditional_transition_approved() {
        let config = simple_workflow();
        let evaluator = TransitionEvaluator::new(&config);
        let state = WorkflowStateManager::new("review", &["annotate", "review"]);

        let result = StepResult::approved();
        let next = evaluator
            .evaluate_next_step("review", &state, Some(&result), None)
            .unwrap();

        // Should go to terminal (None)
        assert_eq!(next, None);
    }

    #[test]
    fn test_conditional_transition_rejected() {
        let config = simple_workflow();
        let evaluator = TransitionEvaluator::new(&config);
        let state = WorkflowStateManager::new("review", &["annotate", "review"]);

        let result = StepResult::rejected("Needs improvement");
        let next = evaluator
            .evaluate_next_step("review", &state, Some(&result), None)
            .unwrap();

        // Should loop back to annotate
        assert_eq!(next, Some("annotate".to_string()));
    }

    #[test]
    fn test_terminal_step_check() {
        let config = simple_workflow();
        let evaluator = TransitionEvaluator::new(&config);

        assert!(evaluator.is_terminal_step("_complete"));
        assert!(evaluator.is_terminal_step("_failed"));
        assert!(!evaluator.is_terminal_step("annotate"));
    }

    #[test]
    fn test_entry_step() {
        let config = simple_workflow();
        let evaluator = TransitionEvaluator::new(&config);

        assert_eq!(evaluator.entry_step(), Some("annotate"));
    }
}
