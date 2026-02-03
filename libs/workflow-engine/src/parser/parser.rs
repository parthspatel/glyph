//! YAML workflow parser
//!
//! Parses YAML strings into validated WorkflowConfig structures.

use thiserror::Error;

use crate::config::{StepLibrary, WorkflowConfig};

use super::validator::{validate_workflow, ValidationError};

// =============================================================================
// Errors
// =============================================================================

/// Errors that can occur during workflow parsing
#[derive(Debug, Error)]
pub enum ParseError {
    /// YAML parsing failed
    #[error("YAML parse error: {0}")]
    YamlError(#[from] serde_yml::Error),

    /// Workflow validation failed
    #[error("Validation error: {0}")]
    ValidationError(#[from] ValidationError),
}

// =============================================================================
// Parser Functions
// =============================================================================

/// Parse a YAML workflow configuration string
///
/// # Arguments
/// * `yaml` - The YAML string to parse
///
/// # Returns
/// The validated `WorkflowConfig` or a `ParseError`
///
/// # Example
/// ```ignore
/// let yaml = r#"
/// version: "1.0"
/// name: "Simple Workflow"
/// workflow_type: single
/// steps:
///   - id: annotate
///     name: Annotation
///     step_type: annotation
/// transitions:
///   - from: annotate
///     to: _complete
/// "#;
///
/// let config = parse_workflow(yaml)?;
/// ```
pub fn parse_workflow(yaml: &str) -> Result<WorkflowConfig, ParseError> {
    let config: WorkflowConfig = serde_yml::from_str(yaml)?;
    validate_workflow(&config)?;
    Ok(config)
}

/// Parse a YAML workflow configuration with step library resolution
///
/// # Arguments
/// * `yaml` - The YAML string to parse
/// * `library` - The step library to resolve template references
///
/// # Returns
/// The validated `WorkflowConfig` with resolved step templates
pub fn parse_workflow_with_library(
    yaml: &str,
    library: &StepLibrary,
) -> Result<WorkflowConfig, ParseError> {
    let mut config: WorkflowConfig = serde_yml::from_str(yaml)?;

    // Resolve step library references
    for step in &mut config.steps {
        if let Some(ref ref_name) = step.ref_name {
            let resolved = library.resolve(&step.id, ref_name, step.overrides.as_ref())?;
            // Keep the step ID and name, but apply template settings
            step.step_type = resolved.step_type;
            step.settings = resolved.settings;
        }
    }

    validate_workflow(&config)?;
    Ok(config)
}

impl From<crate::config::ConfigError> for ParseError {
    fn from(err: crate::config::ConfigError) -> Self {
        Self::ValidationError(ValidationError::new(err.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_workflow() {
        let yaml = r#"
version: "1.0"
name: "Simple Workflow"
workflow_type: single
steps:
  - id: annotate
    name: Annotation
    step_type: annotation
transitions:
  - from: annotate
    to: _complete
"#;

        let config = parse_workflow(yaml).unwrap();
        assert_eq!(config.name, "Simple Workflow");
        assert_eq!(config.steps.len(), 1);
        assert_eq!(config.transitions.len(), 1);
    }

    #[test]
    fn test_parse_with_settings() {
        let yaml = r#"
version: "1.0"
name: "Review Workflow"
workflow_type: multi_adjudication
settings:
  min_annotators: 3
  consensus_threshold: 0.8
steps:
  - id: annotate
    name: Annotation
    step_type: annotation
    settings:
      timeout_minutes: 60
      visibility: blind
  - id: review
    name: Review
    step_type: review
    settings:
      visibility: collaborative
      show_previous: true
transitions:
  - from: annotate
    to: review
  - from: review
    to: _complete
"#;

        let config = parse_workflow(yaml).unwrap();
        assert_eq!(config.settings.min_annotators, Some(3));
        assert_eq!(config.steps.len(), 2);
    }

    #[test]
    fn test_parse_invalid_yaml() {
        let yaml = "invalid: [yaml: {";
        let result = parse_workflow(yaml);
        assert!(matches!(result, Err(ParseError::YamlError(_))));
    }

    #[test]
    fn test_parse_with_library() {
        let yaml = r#"
version: "1.0"
name: "Template Workflow"
workflow_type: single
steps:
  - id: step1
    name: From Template
    step_type: annotation
    ref_name: single
transitions:
  - from: step1
    to: _complete
"#;

        let library = StepLibrary::with_predefined();
        let config = parse_workflow_with_library(yaml, &library).unwrap();

        // Should have resolved the template
        assert_eq!(config.steps[0].settings.timeout_minutes, Some(120));
        assert_eq!(config.steps[0].settings.min_annotators, Some(1));
    }
}
