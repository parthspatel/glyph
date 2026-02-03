//! Condition evaluation for workflow transitions
//!
//! Supports built-in conditions (always, on_complete, on_agreement, on_disagreement)
//! and simple expression evaluation.

use std::collections::HashMap;

use thiserror::Error;

use crate::config::TransitionConditionConfig;
use crate::state::{StepResult, StepState};

// =============================================================================
// Errors
// =============================================================================

/// Errors that can occur during condition evaluation
#[derive(Debug, Error)]
pub enum ConditionError {
    /// Failed to parse expression
    #[error("Parse error: {0}")]
    ParseError(String),

    /// Invalid field reference
    #[error("Invalid field: {0}")]
    InvalidField(String),

    /// Type mismatch in comparison
    #[error("Type mismatch: expected {expected}, got {got}")]
    TypeMismatch { expected: String, got: String },

    /// Missing required context
    #[error("Missing context: {0}")]
    MissingContext(String),
}

// =============================================================================
// Condition Context
// =============================================================================

/// Context available for condition evaluation
#[derive(Debug)]
pub struct ConditionContext<'a> {
    /// Result from the completed step (if any)
    pub step_result: Option<&'a StepResult>,

    /// Consensus agreement score (0.0 to 1.0)
    pub consensus_agreement: Option<f64>,

    /// Shared workflow context
    pub workflow_context: &'a serde_json::Value,

    /// All step states
    pub step_states: &'a HashMap<String, StepState>,
}

impl<'a> ConditionContext<'a> {
    /// Create a new condition context
    #[must_use]
    pub fn new(
        step_result: Option<&'a StepResult>,
        consensus_agreement: Option<f64>,
        workflow_context: &'a serde_json::Value,
        step_states: &'a HashMap<String, StepState>,
    ) -> Self {
        Self {
            step_result,
            consensus_agreement,
            workflow_context,
            step_states,
        }
    }
}

// =============================================================================
// Condition Evaluation
// =============================================================================

/// Evaluate a transition condition
///
/// # Arguments
/// * `condition` - The condition configuration to evaluate
/// * `ctx` - Context containing step results, consensus scores, and workflow state
///
/// # Returns
/// `true` if the condition is met, `false` otherwise
pub fn evaluate_condition(
    condition: &TransitionConditionConfig,
    ctx: &ConditionContext<'_>,
) -> Result<bool, ConditionError> {
    match condition.condition_type.as_str() {
        "always" => Ok(true),

        "on_complete" => {
            // True if step completed (result exists)
            Ok(ctx.step_result.is_some())
        }

        "on_agreement" => {
            let threshold = condition.threshold.unwrap_or(0.8);
            Ok(ctx
                .consensus_agreement
                .map(|a| a >= threshold)
                .unwrap_or(false))
        }

        "on_disagreement" => {
            let threshold = condition.threshold.unwrap_or(0.8);
            Ok(ctx
                .consensus_agreement
                .map(|a| a < threshold)
                .unwrap_or(false))
        }

        "on_approved" => Ok(matches!(ctx.step_result, Some(StepResult::Approved))),

        "on_rejected" => Ok(matches!(ctx.step_result, Some(StepResult::Rejected { .. }))),

        "expression" => {
            let expr = condition
                .expression
                .as_ref()
                .ok_or_else(|| ConditionError::ParseError("Missing expression".to_string()))?;
            evaluate_expression(expr, ctx)
        }

        unknown => Err(ConditionError::ParseError(format!(
            "Unknown condition type: {unknown}"
        ))),
    }
}

/// Evaluate a simple expression
///
/// Supported expressions:
/// - `agreement >= 0.8` - Compare agreement score
/// - `step.X.completed` - Check if step X is completed
/// - `context.field == "value"` - Compare context value
fn evaluate_expression(expr: &str, ctx: &ConditionContext<'_>) -> Result<bool, ConditionError> {
    let expr = expr.trim();

    // Try parsing as comparison: "field op value"
    if let Some(result) = try_parse_comparison(expr, ctx)? {
        return Ok(result);
    }

    // Try parsing as step state check: "step.X.completed"
    if let Some(result) = try_parse_step_check(expr, ctx)? {
        return Ok(result);
    }

    Err(ConditionError::ParseError(format!(
        "Cannot parse expression: {expr}"
    )))
}

/// Try to parse expression as a comparison (e.g., "agreement >= 0.8")
fn try_parse_comparison(
    expr: &str,
    ctx: &ConditionContext<'_>,
) -> Result<Option<bool>, ConditionError> {
    // Supported operators (ordered by length for matching)
    let operators = [">=", "<=", "==", "!=", ">", "<"];

    for op in operators {
        if let Some(idx) = expr.find(op) {
            let field = expr[..idx].trim();
            let value = expr[idx + op.len()..].trim();

            let field_value = resolve_field_value(field, ctx)?;
            let compare_value = parse_value(value)?;

            return Ok(Some(compare_values(&field_value, op, &compare_value)?));
        }
    }

    Ok(None)
}

/// Try to parse expression as a step state check
fn try_parse_step_check(
    expr: &str,
    ctx: &ConditionContext<'_>,
) -> Result<Option<bool>, ConditionError> {
    // Pattern: step.STEP_ID.STATE
    if let Some(rest) = expr.strip_prefix("step.") {
        let parts: Vec<&str> = rest.splitn(2, '.').collect();
        if parts.len() == 2 {
            let step_id = parts[0];
            let state_check = parts[1];

            let step_state = ctx
                .step_states
                .get(step_id)
                .ok_or_else(|| ConditionError::InvalidField(format!("step.{step_id}")))?;

            let result = match state_check {
                "completed" => step_state.is_terminal(),
                "active" => step_state.is_active(),
                "pending" => step_state.is_pending(),
                "failed" => step_state.is_failed(),
                _ => {
                    return Err(ConditionError::InvalidField(format!(
                        "Unknown state check: {state_check}"
                    )))
                }
            };

            return Ok(Some(result));
        }
    }

    Ok(None)
}

/// Resolve a field reference to its value
fn resolve_field_value(
    field: &str,
    ctx: &ConditionContext<'_>,
) -> Result<FieldValue, ConditionError> {
    match field {
        "agreement" => Ok(FieldValue::Number(ctx.consensus_agreement.unwrap_or(0.0))),

        _ if field.starts_with("context.") => {
            let path = &field[8..];
            let value = get_json_path(ctx.workflow_context, path)
                .ok_or_else(|| ConditionError::MissingContext(field.to_string()))?;
            Ok(json_to_field_value(value))
        }

        _ => Err(ConditionError::InvalidField(field.to_string())),
    }
}

/// Get a value from JSON by dot-separated path
fn get_json_path<'a>(json: &'a serde_json::Value, path: &str) -> Option<&'a serde_json::Value> {
    let mut current = json;
    for part in path.split('.') {
        current = current.get(part)?;
    }
    Some(current)
}

/// Internal value type for comparisons
#[derive(Debug, Clone)]
enum FieldValue {
    Number(f64),
    String(String),
    Bool(bool),
    Null,
}

/// Convert JSON value to FieldValue
fn json_to_field_value(value: &serde_json::Value) -> FieldValue {
    match value {
        serde_json::Value::Number(n) => FieldValue::Number(n.as_f64().unwrap_or(0.0)),
        serde_json::Value::String(s) => FieldValue::String(s.clone()),
        serde_json::Value::Bool(b) => FieldValue::Bool(*b),
        serde_json::Value::Null => FieldValue::Null,
        _ => FieldValue::String(value.to_string()),
    }
}

/// Parse a literal value from expression
fn parse_value(value: &str) -> Result<FieldValue, ConditionError> {
    // Try as number
    if let Ok(n) = value.parse::<f64>() {
        return Ok(FieldValue::Number(n));
    }

    // Try as boolean
    match value {
        "true" => return Ok(FieldValue::Bool(true)),
        "false" => return Ok(FieldValue::Bool(false)),
        "null" => return Ok(FieldValue::Null),
        _ => {}
    }

    // Try as quoted string
    if (value.starts_with('"') && value.ends_with('"'))
        || (value.starts_with('\'') && value.ends_with('\''))
    {
        return Ok(FieldValue::String(value[1..value.len() - 1].to_string()));
    }

    // Treat as unquoted string
    Ok(FieldValue::String(value.to_string()))
}

/// Compare two field values with an operator
fn compare_values(left: &FieldValue, op: &str, right: &FieldValue) -> Result<bool, ConditionError> {
    match (left, right) {
        (FieldValue::Number(l), FieldValue::Number(r)) => match op {
            "==" => Ok((l - r).abs() < f64::EPSILON),
            "!=" => Ok((l - r).abs() >= f64::EPSILON),
            ">" => Ok(l > r),
            "<" => Ok(l < r),
            ">=" => Ok(l >= r),
            "<=" => Ok(l <= r),
            _ => Err(ConditionError::ParseError(format!(
                "Unknown operator: {op}"
            ))),
        },

        (FieldValue::String(l), FieldValue::String(r)) => match op {
            "==" => Ok(l == r),
            "!=" => Ok(l != r),
            _ => Err(ConditionError::TypeMismatch {
                expected: "number for comparison".to_string(),
                got: "string".to_string(),
            }),
        },

        (FieldValue::Bool(l), FieldValue::Bool(r)) => match op {
            "==" => Ok(l == r),
            "!=" => Ok(l != r),
            _ => Err(ConditionError::TypeMismatch {
                expected: "number for comparison".to_string(),
                got: "boolean".to_string(),
            }),
        },

        _ => Err(ConditionError::TypeMismatch {
            expected: "matching types".to_string(),
            got: "mismatched types".to_string(),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_context() -> ConditionContext<'static> {
        static EMPTY_CONTEXT: serde_json::Value = serde_json::Value::Null;
        static EMPTY_STATES: std::sync::LazyLock<HashMap<String, StepState>> =
            std::sync::LazyLock::new(HashMap::new);

        ConditionContext {
            step_result: None,
            consensus_agreement: None,
            workflow_context: &EMPTY_CONTEXT,
            step_states: &EMPTY_STATES,
        }
    }

    #[test]
    fn test_always_condition() {
        let condition = TransitionConditionConfig {
            condition_type: "always".to_string(),
            expression: None,
            threshold: None,
        };

        let ctx = empty_context();
        assert!(evaluate_condition(&condition, &ctx).unwrap());
    }

    #[test]
    fn test_on_complete_condition() {
        let condition = TransitionConditionConfig {
            condition_type: "on_complete".to_string(),
            expression: None,
            threshold: None,
        };

        // Without result
        let ctx = empty_context();
        assert!(!evaluate_condition(&condition, &ctx).unwrap());

        // With result
        let result = StepResult::approved();
        let ctx = ConditionContext {
            step_result: Some(&result),
            ..empty_context()
        };
        assert!(evaluate_condition(&condition, &ctx).unwrap());
    }

    #[test]
    fn test_on_agreement_condition() {
        let condition = TransitionConditionConfig {
            condition_type: "on_agreement".to_string(),
            expression: None,
            threshold: Some(0.8),
        };

        // Below threshold
        let ctx = ConditionContext {
            consensus_agreement: Some(0.7),
            ..empty_context()
        };
        assert!(!evaluate_condition(&condition, &ctx).unwrap());

        // At threshold
        let ctx = ConditionContext {
            consensus_agreement: Some(0.8),
            ..empty_context()
        };
        assert!(evaluate_condition(&condition, &ctx).unwrap());

        // Above threshold
        let ctx = ConditionContext {
            consensus_agreement: Some(0.9),
            ..empty_context()
        };
        assert!(evaluate_condition(&condition, &ctx).unwrap());
    }

    #[test]
    fn test_expression_agreement() {
        let condition = TransitionConditionConfig {
            condition_type: "expression".to_string(),
            expression: Some("agreement >= 0.75".to_string()),
            threshold: None,
        };

        let ctx = ConditionContext {
            consensus_agreement: Some(0.8),
            ..empty_context()
        };
        assert!(evaluate_condition(&condition, &ctx).unwrap());
    }

    #[test]
    fn test_expression_step_check() {
        let condition = TransitionConditionConfig {
            condition_type: "expression".to_string(),
            expression: Some("step.annotate.completed".to_string()),
            threshold: None,
        };

        let mut states = HashMap::new();
        states.insert(
            "annotate".to_string(),
            StepState::Completed {
                completed_at: chrono::Utc::now(),
                result: StepResult::approved(),
            },
        );

        let workflow_ctx = serde_json::Value::Null;
        let ctx = ConditionContext {
            step_result: None,
            consensus_agreement: None,
            workflow_context: &workflow_ctx,
            step_states: &states,
        };

        assert!(evaluate_condition(&condition, &ctx).unwrap());
    }
}
