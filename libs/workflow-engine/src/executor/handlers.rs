//! Handler registry for auto-process steps
//!
//! Provides a registry of handlers that can be executed by auto-process steps,
//! including built-in handlers like consensus calculation.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::config::AgreementMetric;
use crate::consensus::{cohens_kappa, iou_span, krippendorffs_alpha_nominal, Span};

// =============================================================================
// Handler Types
// =============================================================================

/// Input to a handler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandlerInput {
    /// Annotation data for consensus calculation
    pub annotations: Vec<serde_json::Value>,

    /// Workflow context
    pub context: serde_json::Value,

    /// Handler-specific configuration
    pub config: serde_json::Value,
}

/// Output from a handler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandlerOutput {
    /// Handler result data
    pub result: serde_json::Value,

    /// Consensus agreement score (if applicable)
    pub consensus_agreement: Option<f64>,

    /// Additional metadata
    pub metadata: serde_json::Value,
}

/// Handler errors
#[derive(Debug, Error)]
pub enum HandlerError {
    /// Execution failed
    #[error("Execution failed: {0}")]
    ExecutionFailed(String),

    /// Invalid input data
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// Handler timed out
    #[error("Handler timed out")]
    Timeout,
}

// =============================================================================
// Handler Trait
// =============================================================================

/// Trait for auto-process handlers
#[async_trait]
pub trait Handler: Send + Sync {
    /// Execute the handler
    async fn execute(&self, input: HandlerInput) -> Result<HandlerOutput, HandlerError>;

    /// Get the handler name
    fn name(&self) -> &str;
}

// =============================================================================
// Handler Registry
// =============================================================================

/// Registry of available handlers
#[derive(Default)]
pub struct HandlerRegistry {
    handlers: HashMap<String, Arc<dyn Handler>>,
}

impl HandlerRegistry {
    /// Create a new empty registry
    #[must_use]
    pub fn new() -> Self {
        Self {
            handlers: HashMap::new(),
        }
    }

    /// Create a registry with built-in handlers
    #[must_use]
    pub fn with_builtins() -> Self {
        let mut registry = Self::new();
        registry.register(Arc::new(ConsensusCalculatorHandler));
        registry.register(Arc::new(MergeAnnotationsHandler));
        registry
    }

    /// Register a handler
    pub fn register(&mut self, handler: Arc<dyn Handler>) {
        self.handlers.insert(handler.name().to_string(), handler);
    }

    /// Get a handler by name
    #[must_use]
    pub fn get(&self, name: &str) -> Option<Arc<dyn Handler>> {
        self.handlers.get(name).cloned()
    }

    /// List available handler names
    #[must_use]
    pub fn list(&self) -> Vec<&str> {
        self.handlers.keys().map(String::as_str).collect()
    }
}

// =============================================================================
// Built-in Handlers
// =============================================================================

/// Handler that calculates consensus between annotations
pub struct ConsensusCalculatorHandler;

#[async_trait]
impl Handler for ConsensusCalculatorHandler {
    async fn execute(&self, input: HandlerInput) -> Result<HandlerOutput, HandlerError> {
        let metric = input
            .config
            .get("metric")
            .and_then(|v| v.as_str())
            .unwrap_or("krippendorffs_alpha");

        let metric = match metric {
            "cohens_kappa" => AgreementMetric::CohensKappa,
            "krippendorffs_alpha" => AgreementMetric::KrippendorffsAlpha,
            "iou" => AgreementMetric::Iou,
            "percent_agreement" => AgreementMetric::PercentAgreement,
            _ => AgreementMetric::KrippendorffsAlpha,
        };

        let agreement = calculate_consensus(&input.annotations, metric)?;

        Ok(HandlerOutput {
            result: serde_json::json!({
                "metric": format!("{metric:?}"),
                "agreement": agreement
            }),
            consensus_agreement: Some(agreement),
            metadata: serde_json::json!({}),
        })
    }

    fn name(&self) -> &str {
        "consensus_calculator"
    }
}

/// Handler that merges multiple annotations into a single result
pub struct MergeAnnotationsHandler;

#[async_trait]
impl Handler for MergeAnnotationsHandler {
    async fn execute(&self, input: HandlerInput) -> Result<HandlerOutput, HandlerError> {
        if input.annotations.is_empty() {
            return Err(HandlerError::InvalidInput(
                "No annotations to merge".to_string(),
            ));
        }

        // Simple merge strategy: use first annotation as base
        // In production, this would be more sophisticated
        let merged = input.annotations[0].clone();

        Ok(HandlerOutput {
            result: merged,
            consensus_agreement: None,
            metadata: serde_json::json!({
                "merged_count": input.annotations.len()
            }),
        })
    }

    fn name(&self) -> &str {
        "merge_annotations"
    }
}

// =============================================================================
// Consensus Calculation
// =============================================================================

/// Calculate consensus using the specified metric
fn calculate_consensus(
    annotations: &[serde_json::Value],
    metric: AgreementMetric,
) -> Result<f64, HandlerError> {
    if annotations.len() < 2 {
        return Err(HandlerError::InvalidInput(
            "Need at least 2 annotations for consensus".to_string(),
        ));
    }

    match metric {
        AgreementMetric::CohensKappa => calculate_kappa(annotations),
        AgreementMetric::KrippendorffsAlpha => calculate_alpha(annotations),
        AgreementMetric::Iou => calculate_iou(annotations),
        AgreementMetric::PercentAgreement => calculate_percent_agreement(annotations),
        AgreementMetric::MajorityVote => {
            // Majority vote doesn't return agreement, just success
            Ok(1.0)
        }
    }
}

fn calculate_kappa(annotations: &[serde_json::Value]) -> Result<f64, HandlerError> {
    if annotations.len() != 2 {
        return Err(HandlerError::InvalidInput(
            "Cohen's Kappa requires exactly 2 annotators".to_string(),
        ));
    }

    // Extract labels from annotations
    let labels_a = extract_labels(&annotations[0])?;
    let labels_b = extract_labels(&annotations[1])?;

    cohens_kappa(&labels_a, &labels_b).map_err(|e| HandlerError::ExecutionFailed(e.to_string()))
}

fn calculate_alpha(annotations: &[serde_json::Value]) -> Result<f64, HandlerError> {
    // Convert annotations to matrix format for Krippendorff's Alpha
    let matrix: Vec<Vec<Option<u32>>> = annotations
        .iter()
        .map(|a| {
            extract_labels(a)
                .ok()
                .map(|labels| labels.into_iter().map(Some).collect())
                .unwrap_or_default()
        })
        .collect();

    krippendorffs_alpha_nominal(&matrix).map_err(|e| HandlerError::ExecutionFailed(e.to_string()))
}

fn calculate_iou(annotations: &[serde_json::Value]) -> Result<f64, HandlerError> {
    if annotations.len() < 2 {
        return Err(HandlerError::InvalidInput(
            "Need at least 2 annotations for IoU".to_string(),
        ));
    }

    // Extract spans from annotations
    let spans: Vec<Vec<Span>> = annotations
        .iter()
        .filter_map(|a| extract_spans(a).ok())
        .collect();

    if spans.len() < 2 {
        return Err(HandlerError::InvalidInput(
            "Could not extract spans from annotations".to_string(),
        ));
    }

    // Calculate pairwise IoU and average
    let mut total_iou = 0.0;
    let mut count = 0;

    for i in 0..spans.len() {
        for j in (i + 1)..spans.len() {
            if !spans[i].is_empty() && !spans[j].is_empty() {
                total_iou += iou_span(&spans[i][0], &spans[j][0]);
                count += 1;
            }
        }
    }

    if count == 0 {
        return Err(HandlerError::InvalidInput(
            "No valid span pairs".to_string(),
        ));
    }

    Ok(total_iou / count as f64)
}

fn calculate_percent_agreement(annotations: &[serde_json::Value]) -> Result<f64, HandlerError> {
    let all_labels: Vec<Vec<u32>> = annotations
        .iter()
        .filter_map(|a| extract_labels(a).ok())
        .collect();

    if all_labels.len() < 2 || all_labels[0].is_empty() {
        return Err(HandlerError::InvalidInput(
            "Not enough valid annotations".to_string(),
        ));
    }

    let num_items = all_labels[0].len();
    let mut agreements = 0;

    for i in 0..num_items {
        let first_label = all_labels[0][i];
        if all_labels
            .iter()
            .all(|labels| labels.get(i).copied() == Some(first_label))
        {
            agreements += 1;
        }
    }

    Ok(agreements as f64 / num_items as f64)
}

/// Extract categorical labels from annotation JSON
fn extract_labels(annotation: &serde_json::Value) -> Result<Vec<u32>, HandlerError> {
    // Try common label formats
    if let Some(labels) = annotation.get("labels").and_then(|v| v.as_array()) {
        return labels
            .iter()
            .map(|v| {
                v.as_u64()
                    .map(|n| n as u32)
                    .ok_or_else(|| HandlerError::InvalidInput("Invalid label format".to_string()))
            })
            .collect();
    }

    if let Some(label) = annotation.get("label").and_then(|v| v.as_u64()) {
        return Ok(vec![label as u32]);
    }

    Err(HandlerError::InvalidInput(
        "Could not extract labels from annotation".to_string(),
    ))
}

/// Extract spans from annotation JSON
fn extract_spans(annotation: &serde_json::Value) -> Result<Vec<Span>, HandlerError> {
    if let Some(spans) = annotation.get("spans").and_then(|v| v.as_array()) {
        return spans
            .iter()
            .map(|s| {
                let start =
                    s.get("start").and_then(|v| v.as_u64()).ok_or_else(|| {
                        HandlerError::InvalidInput("Missing span start".to_string())
                    })? as usize;
                let end = s
                    .get("end")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| HandlerError::InvalidInput("Missing span end".to_string()))?
                    as usize;
                Ok(Span::new(start, end))
            })
            .collect();
    }

    Err(HandlerError::InvalidInput(
        "Could not extract spans from annotation".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_consensus_calculator() {
        let handler = ConsensusCalculatorHandler;

        let input = HandlerInput {
            annotations: vec![
                serde_json::json!({"labels": [1, 2, 1, 2]}),
                serde_json::json!({"labels": [1, 2, 1, 2]}),
            ],
            context: serde_json::json!({}),
            config: serde_json::json!({"metric": "cohens_kappa"}),
        };

        let output = handler.execute(input).await.unwrap();
        assert!(output.consensus_agreement.is_some());
        assert!((output.consensus_agreement.unwrap() - 1.0).abs() < 0.001);
    }

    #[tokio::test]
    async fn test_merge_handler() {
        let handler = MergeAnnotationsHandler;

        let input = HandlerInput {
            annotations: vec![
                serde_json::json!({"label": "test1"}),
                serde_json::json!({"label": "test2"}),
            ],
            context: serde_json::json!({}),
            config: serde_json::json!({}),
        };

        let output = handler.execute(input).await.unwrap();
        assert_eq!(output.result["label"], "test1");
    }

    #[test]
    fn test_registry_builtins() {
        let registry = HandlerRegistry::with_builtins();
        assert!(registry.get("consensus_calculator").is_some());
        assert!(registry.get("merge_annotations").is_some());
    }
}
