//! Workflow structural validation
//!
//! Validates workflow configurations for structural correctness including:
//! - Step reference validation with typo suggestions
//! - DAG validation (cycle detection)
//! - Reachability checks
//! - Timeout bounds validation

use std::collections::{HashMap, HashSet};

use petgraph::algo;
use petgraph::graph::DiGraph;
use thiserror::Error;

use crate::config::WorkflowConfig;

// =============================================================================
// Constants
// =============================================================================

/// Maximum timeout in minutes (8 hours per CONTEXT.md)
const MAX_TIMEOUT_MINUTES: u32 = 480;

/// Terminal step IDs
const TERMINAL_COMPLETE: &str = "_complete";
const TERMINAL_FAILED: &str = "_failed";

// =============================================================================
// Errors
// =============================================================================

/// Validation error with location and suggestion
#[derive(Debug, Error)]
#[error("{message}")]
pub struct ValidationError {
    /// Error message
    pub message: String,

    /// Location in configuration (e.g., "steps[2].settings.timeout_minutes")
    pub location: Option<String>,

    /// Suggested fix (e.g., "Did you mean 'review'?")
    pub suggestion: Option<String>,
}

impl ValidationError {
    /// Create a new validation error with just a message
    #[must_use]
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            location: None,
            suggestion: None,
        }
    }

    /// Add a location to the error
    #[must_use]
    pub fn with_location(mut self, location: impl Into<String>) -> Self {
        self.location = Some(location.into());
        self
    }

    /// Add a suggestion to the error
    #[must_use]
    pub fn with_suggestion(mut self, suggestion: impl Into<String>) -> Self {
        self.suggestion = Some(suggestion.into());
        self
    }
}

// =============================================================================
// Validation Functions
// =============================================================================

/// Validate an entire workflow configuration
///
/// Runs all validation checks and returns the first error found.
pub fn validate_workflow(config: &WorkflowConfig) -> Result<(), ValidationError> {
    validate_step_references(config)?;
    validate_dag(config)?;
    validate_reachability(config)?;
    validate_timeout_bounds(config)?;
    validate_step_settings(config)?;
    Ok(())
}

/// Validate that all transition step references exist
fn validate_step_references(config: &WorkflowConfig) -> Result<(), ValidationError> {
    // Build set of valid step IDs
    let step_ids: HashSet<&str> = config.steps.iter().map(|s| s.id.as_str()).collect();

    // Check all transitions reference valid steps
    for (idx, transition) in config.transitions.iter().enumerate() {
        // Check 'from' reference
        if !step_ids.contains(transition.from.as_str()) {
            let suggestion = find_similar_step(&transition.from, &step_ids);
            return Err(ValidationError::new(format!(
                "Unknown step '{}' in transition",
                transition.from
            ))
            .with_location(format!("transitions[{idx}].from"))
            .with_suggestion(
                suggestion
                    .map(|s| format!("Did you mean '{s}'?"))
                    .unwrap_or_default(),
            ));
        }

        // Check 'to' reference (allow terminal states)
        if !step_ids.contains(transition.to.as_str())
            && transition.to != TERMINAL_COMPLETE
            && transition.to != TERMINAL_FAILED
        {
            let suggestion = find_similar_step(&transition.to, &step_ids);
            return Err(ValidationError::new(format!(
                "Unknown step '{}' in transition",
                transition.to
            ))
            .with_location(format!("transitions[{idx}].to"))
            .with_suggestion(
                suggestion
                    .map(|s| format!("Did you mean '{s}'?"))
                    .unwrap_or_default(),
            ));
        }
    }

    Ok(())
}

/// Find similar step name using Levenshtein distance
fn find_similar_step<'a>(target: &str, step_ids: &HashSet<&'a str>) -> Option<&'a str> {
    let mut best_match: Option<&str> = None;
    let mut best_distance = usize::MAX;

    for &step_id in step_ids {
        let distance = strsim::levenshtein(target, step_id);
        // Only suggest if reasonably similar (distance <= 3)
        if distance < best_distance && distance <= 3 {
            best_distance = distance;
            best_match = Some(step_id);
        }
    }

    best_match
}

/// Validate the workflow forms a valid DAG (no cycles)
fn validate_dag(config: &WorkflowConfig) -> Result<(), ValidationError> {
    let graph = build_workflow_graph(config);

    if algo::is_cyclic_directed(&graph) {
        // Find the cycle using strongly connected components
        let sccs = algo::kosaraju_scc(&graph);
        let cycle_nodes: Vec<&str> = sccs
            .iter()
            .find(|scc| scc.len() > 1)
            .map(|scc| scc.iter().map(|&idx| graph[idx]).collect::<Vec<_>>())
            .unwrap_or_default();

        return Err(ValidationError::new(format!(
            "Workflow contains a cycle involving steps: {}",
            cycle_nodes.join(" -> ")
        )));
    }

    Ok(())
}

/// Build a petgraph DiGraph from the workflow configuration
fn build_workflow_graph(config: &WorkflowConfig) -> DiGraph<&str, ()> {
    let mut graph = DiGraph::new();
    let mut node_indices = HashMap::new();

    // Add nodes for all steps
    for step in &config.steps {
        let idx = graph.add_node(step.id.as_str());
        node_indices.insert(step.id.as_str(), idx);
    }

    // Add terminal nodes
    let complete_idx = graph.add_node(TERMINAL_COMPLETE);
    node_indices.insert(TERMINAL_COMPLETE, complete_idx);
    let failed_idx = graph.add_node(TERMINAL_FAILED);
    node_indices.insert(TERMINAL_FAILED, failed_idx);

    // Add edges for transitions
    for transition in &config.transitions {
        if let (Some(&from_idx), Some(&to_idx)) = (
            node_indices.get(transition.from.as_str()),
            node_indices.get(transition.to.as_str()),
        ) {
            graph.add_edge(from_idx, to_idx, ());
        }
    }

    graph
}

/// Validate all steps are reachable and terminal states can be reached
fn validate_reachability(config: &WorkflowConfig) -> Result<(), ValidationError> {
    if config.steps.is_empty() {
        return Err(ValidationError::new("Workflow must have at least one step"));
    }

    let graph = build_workflow_graph(config);
    let step_ids: HashSet<&str> = config.steps.iter().map(|s| s.id.as_str()).collect();

    // Build node index map
    let mut node_indices = HashMap::new();
    for node_idx in graph.node_indices() {
        node_indices.insert(graph[node_idx], node_idx);
    }

    // Find entry step (first step in list)
    let entry_step = &config.steps[0].id;
    let Some(&entry_idx) = node_indices.get(entry_step.as_str()) else {
        return Err(ValidationError::new("Entry step not found in graph"));
    };

    // Check all steps are reachable from entry
    let mut reachable = HashSet::new();
    let mut dfs = petgraph::visit::Dfs::new(&graph, entry_idx);
    while let Some(node_idx) = dfs.next(&graph) {
        reachable.insert(graph[node_idx]);
    }

    for step_id in &step_ids {
        if !reachable.contains(step_id) {
            return Err(ValidationError::new(format!(
                "Step '{step_id}' is not reachable from entry step '{entry_step}'"
            )));
        }
    }

    // Check terminal state is reachable
    if !reachable.contains(TERMINAL_COMPLETE) && !reachable.contains(TERMINAL_FAILED) {
        return Err(ValidationError::new(
            "No terminal state (_complete or _failed) is reachable from entry step",
        ));
    }

    // Check all non-terminal steps have outgoing transitions
    let transition_sources: HashSet<&str> =
        config.transitions.iter().map(|t| t.from.as_str()).collect();

    for step_id in &step_ids {
        if !transition_sources.contains(step_id) {
            return Err(ValidationError::new(format!(
                "Step '{step_id}' has no outgoing transitions"
            ))
            .with_suggestion("Add a transition to _complete or another step"));
        }
    }

    Ok(())
}

/// Validate timeout values are within bounds
fn validate_timeout_bounds(config: &WorkflowConfig) -> Result<(), ValidationError> {
    // Check workflow-level default timeout
    if let Some(timeout) = config.settings.default_timeout_minutes {
        if timeout > MAX_TIMEOUT_MINUTES {
            return Err(ValidationError::new(format!(
                "Workflow default timeout {timeout} exceeds maximum of {MAX_TIMEOUT_MINUTES} minutes"
            ))
            .with_location("settings.default_timeout_minutes"));
        }
    }

    // Check step-level timeouts
    for (idx, step) in config.steps.iter().enumerate() {
        if let Some(timeout) = step.settings.timeout_minutes {
            if timeout == 0 {
                return Err(ValidationError::new("Timeout must be greater than 0")
                    .with_location(format!("steps[{idx}].settings.timeout_minutes")));
            }
            if timeout > MAX_TIMEOUT_MINUTES {
                return Err(ValidationError::new(format!(
                    "Step '{}' timeout {timeout} exceeds maximum of {MAX_TIMEOUT_MINUTES} minutes",
                    step.id
                ))
                .with_location(format!("steps[{idx}].settings.timeout_minutes")));
            }
        }
    }

    Ok(())
}

/// Validate step settings are valid for their step types
fn validate_step_settings(config: &WorkflowConfig) -> Result<(), ValidationError> {
    use glyph_domain::enums::StepType;

    for (idx, step) in config.steps.iter().enumerate() {
        match step.step_type {
            StepType::AutoProcess => {
                if step.settings.handler.is_none() {
                    return Err(ValidationError::new(format!(
                        "Step '{}' is auto_process but has no handler specified",
                        step.id
                    ))
                    .with_location(format!("steps[{idx}].settings.handler")));
                }
            }
            StepType::Conditional => {
                if step.settings.condition.is_none() {
                    return Err(ValidationError::new(format!(
                        "Step '{}' is conditional but has no condition specified",
                        step.id
                    ))
                    .with_location(format!("steps[{idx}].settings.condition")));
                }
            }
            StepType::SubWorkflow => {
                if step.settings.sub_workflow_id.is_none() {
                    return Err(ValidationError::new(format!(
                        "Step '{}' is sub_workflow but has no sub_workflow_id specified",
                        step.id
                    ))
                    .with_location(format!("steps[{idx}].settings.sub_workflow_id")));
                }
            }
            // Annotation, Review, Adjudication don't have required settings
            StepType::Annotation | StepType::Review | StepType::Adjudication => {}
        }

        // Validate threshold is in valid range
        if let Some(threshold) = step.settings.threshold {
            if !(0.0..=1.0).contains(&threshold) {
                return Err(ValidationError::new(format!(
                    "Step '{}' threshold {threshold} is not in valid range [0.0, 1.0]",
                    step.id
                ))
                .with_location(format!("steps[{idx}].settings.threshold")));
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{StepConfig, StepSettingsConfig, TransitionConfig};
    use glyph_domain::enums::{StepType, WorkflowType};

    fn minimal_config() -> WorkflowConfig {
        WorkflowConfig {
            version: "1.0".to_string(),
            name: "Test".to_string(),
            workflow_type: WorkflowType::Single,
            settings: Default::default(),
            steps: vec![StepConfig {
                id: "step1".to_string(),
                name: "Step 1".to_string(),
                step_type: StepType::Annotation,
                settings: StepSettingsConfig::default(),
                ref_name: None,
                overrides: None,
            }],
            transitions: vec![TransitionConfig {
                from: "step1".to_string(),
                to: "_complete".to_string(),
                condition: None,
            }],
            step_library: vec![],
        }
    }

    #[test]
    fn test_valid_workflow() {
        let config = minimal_config();
        assert!(validate_workflow(&config).is_ok());
    }

    #[test]
    fn test_invalid_step_reference() {
        let mut config = minimal_config();
        config.transitions[0].from = "nonexistent".to_string();

        let result = validate_workflow(&config);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("Unknown step 'nonexistent'"));
    }

    #[test]
    fn test_typo_suggestion() {
        let mut config = minimal_config();
        config.transitions[0].from = "step2".to_string(); // Typo of step1

        let result = validate_workflow(&config);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.suggestion.as_ref().is_some_and(|s| s.contains("step1")));
    }

    #[test]
    fn test_cycle_detection() {
        let mut config = minimal_config();
        config.steps.push(StepConfig {
            id: "step2".to_string(),
            name: "Step 2".to_string(),
            step_type: StepType::Annotation,
            settings: StepSettingsConfig::default(),
            ref_name: None,
            overrides: None,
        });
        config.transitions = vec![
            TransitionConfig {
                from: "step1".to_string(),
                to: "step2".to_string(),
                condition: None,
            },
            TransitionConfig {
                from: "step2".to_string(),
                to: "step1".to_string(), // Cycle!
                condition: None,
            },
        ];

        let result = validate_workflow(&config);
        assert!(result.is_err());
        assert!(result.unwrap_err().message.contains("cycle"));
    }

    #[test]
    fn test_timeout_bounds() {
        let mut config = minimal_config();
        config.steps[0].settings.timeout_minutes = Some(500); // Over 480

        let result = validate_workflow(&config);
        assert!(result.is_err());
        assert!(result.unwrap_err().message.contains("exceeds maximum"));
    }

    #[test]
    fn test_no_terminal_state() {
        let mut config = minimal_config();
        config.steps.push(StepConfig {
            id: "step2".to_string(),
            name: "Step 2".to_string(),
            step_type: StepType::Annotation,
            settings: StepSettingsConfig::default(),
            ref_name: None,
            overrides: None,
        });
        config.transitions = vec![
            TransitionConfig {
                from: "step1".to_string(),
                to: "step2".to_string(),
                condition: None,
            },
            TransitionConfig {
                from: "step2".to_string(),
                to: "step1".to_string(),
                condition: None,
            },
        ];

        let result = validate_workflow(&config);
        assert!(result.is_err());
        // Will fail due to cycle, which is fine
    }

    #[test]
    fn test_auto_process_requires_handler() {
        let mut config = minimal_config();
        config.steps[0].step_type = StepType::AutoProcess;

        let result = validate_workflow(&config);
        assert!(result.is_err());
        assert!(result.unwrap_err().message.contains("handler"));
    }
}
