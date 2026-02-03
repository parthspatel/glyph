//! Step library for reusable workflow step templates
//!
//! Provides predefined step templates that can be referenced in workflow
//! configurations with optional overrides.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use glyph_domain::enums::StepType;

use super::types::{AgreementMetric, StepConfig, StepSettingsConfig, Visibility};

// =============================================================================
// Errors
// =============================================================================

/// Errors that can occur during step library operations
#[derive(Debug, Error)]
pub enum ConfigError {
    /// Template not found in library
    #[error("Step template not found: {0}")]
    TemplateNotFound(String),

    /// Invalid override value
    #[error("Invalid override for field '{field}': {message}")]
    InvalidOverride { field: String, message: String },

    /// YAML parse error
    #[error("Failed to parse configuration: {0}")]
    ParseError(String),

    /// Validation error
    #[error("Validation error: {0}")]
    ValidationError(String),
}

// =============================================================================
// Step Template
// =============================================================================

/// A reusable step template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepTemplate {
    /// Template name
    pub name: String,

    /// Default step type
    pub step_type: StepType,

    /// Default settings
    pub settings: StepSettingsConfig,

    /// Description for documentation
    #[serde(default)]
    pub description: Option<String>,
}

// =============================================================================
// Step Library
// =============================================================================

/// Library of reusable step templates
#[derive(Debug, Clone, Default)]
pub struct StepLibrary {
    templates: HashMap<String, StepTemplate>,
}

impl StepLibrary {
    /// Create a new empty step library
    #[must_use]
    pub fn new() -> Self {
        Self {
            templates: HashMap::new(),
        }
    }

    /// Create a step library with predefined templates (per PRD §4.8.6)
    #[must_use]
    pub fn with_predefined() -> Self {
        let mut library = Self::new();

        // Single annotator workflow template
        library.register(
            "single",
            StepTemplate {
                name: "Single Annotator".to_string(),
                step_type: StepType::Annotation,
                settings: StepSettingsConfig {
                    timeout_minutes: Some(120),
                    visibility: Some(Visibility::Blind),
                    min_annotators: Some(1),
                    ..Default::default()
                },
                description: Some("Basic single annotator step with 2-hour timeout".to_string()),
            },
        );

        // Multi-annotator with adjudication template
        library.register(
            "multi_adjudication",
            StepTemplate {
                name: "Multi-Annotator with Adjudication".to_string(),
                step_type: StepType::Annotation,
                settings: StepSettingsConfig {
                    timeout_minutes: Some(120),
                    visibility: Some(Visibility::Blind),
                    min_annotators: Some(3),
                    agreement_metric: Some(AgreementMetric::KrippendorffsAlpha),
                    threshold: Some(0.8),
                    ..Default::default()
                },
                description: Some(
                    "Multiple annotators with consensus check and adjudication fallback"
                        .to_string(),
                ),
            },
        );

        // Review required template
        library.register(
            "review_required",
            StepTemplate {
                name: "Review Step".to_string(),
                step_type: StepType::Review,
                settings: StepSettingsConfig {
                    timeout_minutes: Some(60),
                    visibility: Some(Visibility::Collaborative),
                    show_previous: Some(true),
                    ..Default::default()
                },
                description: Some(
                    "Review step where reviewer can see previous annotations".to_string(),
                ),
            },
        );

        // Iterative refinement template
        library.register(
            "iterative_refinement",
            StepTemplate {
                name: "Iterative Refinement".to_string(),
                step_type: StepType::Annotation,
                settings: StepSettingsConfig {
                    timeout_minutes: Some(180),
                    visibility: Some(Visibility::Collaborative),
                    show_previous: Some(true),
                    min_annotators: Some(2),
                    ..Default::default()
                },
                description: Some(
                    "Collaborative annotation with iterative improvements".to_string(),
                ),
            },
        );

        // Adjudication template
        library.register(
            "adjudication",
            StepTemplate {
                name: "Adjudication".to_string(),
                step_type: StepType::Adjudication,
                settings: StepSettingsConfig {
                    timeout_minutes: Some(120),
                    visibility: Some(Visibility::Collaborative),
                    show_previous: Some(true),
                    required_roles: Some(vec!["adjudicator".to_string()]),
                    ..Default::default()
                },
                description: Some("Expert adjudication to resolve disagreements".to_string()),
            },
        );

        library
    }

    /// Register a template in the library
    pub fn register(&mut self, name: &str, template: StepTemplate) {
        self.templates.insert(name.to_string(), template);
    }

    /// Get a template by name
    #[must_use]
    pub fn get(&self, name: &str) -> Option<&StepTemplate> {
        self.templates.get(name)
    }

    /// List all template names
    #[must_use]
    pub fn list_templates(&self) -> Vec<&str> {
        self.templates.keys().map(String::as_str).collect()
    }

    /// Resolve a template reference into a full StepConfig
    ///
    /// # Arguments
    /// * `step_id` - The ID for the resolved step
    /// * `ref_name` - The template name to resolve
    /// * `overrides` - Optional JSON overrides for the template settings
    ///
    /// # Errors
    /// Returns `ConfigError::TemplateNotFound` if the template doesn't exist
    /// Returns `ConfigError::InvalidOverride` if override values are invalid
    pub fn resolve(
        &self,
        step_id: &str,
        ref_name: &str,
        overrides: Option<&serde_json::Value>,
    ) -> Result<StepConfig, ConfigError> {
        let template = self
            .templates
            .get(ref_name)
            .ok_or_else(|| ConfigError::TemplateNotFound(ref_name.to_string()))?;

        let mut settings = template.settings.clone();

        // Apply overrides if provided
        if let Some(overrides) = overrides {
            Self::apply_overrides(&mut settings, overrides)?;
        }

        Ok(StepConfig {
            id: step_id.to_string(),
            name: template.name.clone(),
            step_type: template.step_type,
            settings,
            ref_name: Some(ref_name.to_string()),
            overrides: overrides.cloned(),
        })
    }

    /// Apply JSON overrides to step settings
    fn apply_overrides(
        settings: &mut StepSettingsConfig,
        overrides: &serde_json::Value,
    ) -> Result<(), ConfigError> {
        let Some(obj) = overrides.as_object() else {
            return Err(ConfigError::InvalidOverride {
                field: "root".to_string(),
                message: "Overrides must be an object".to_string(),
            });
        };

        for (key, value) in obj {
            match key.as_str() {
                "timeout_minutes" => {
                    settings.timeout_minutes = value.as_u64().map(|v| v as u32);
                }
                "visibility" => {
                    if let Some(s) = value.as_str() {
                        settings.visibility = Some(match s {
                            "blind" => Visibility::Blind,
                            "collaborative" => Visibility::Collaborative,
                            _ => {
                                return Err(ConfigError::InvalidOverride {
                                    field: "visibility".to_string(),
                                    message: format!("Unknown visibility: {s}"),
                                })
                            }
                        });
                    }
                }
                "min_annotators" => {
                    settings.min_annotators = value.as_u64().map(|v| v as u32);
                }
                "threshold" => {
                    settings.threshold = value.as_f64();
                }
                "handler" => {
                    settings.handler = value.as_str().map(String::from);
                }
                "condition" => {
                    settings.condition = value.as_str().map(String::from);
                }
                "sub_workflow_id" => {
                    settings.sub_workflow_id = value.as_str().map(String::from);
                }
                "show_previous" => {
                    settings.show_previous = value.as_bool();
                }
                "required_roles" => {
                    if let Some(arr) = value.as_array() {
                        settings.required_roles = Some(
                            arr.iter()
                                .filter_map(|v| v.as_str().map(String::from))
                                .collect(),
                        );
                    }
                }
                "required_skills" => {
                    if let Some(arr) = value.as_array() {
                        settings.required_skills = Some(
                            arr.iter()
                                .filter_map(|v| v.as_str().map(String::from))
                                .collect(),
                        );
                    }
                }
                _ => {
                    // Unknown fields are ignored for forward compatibility
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_predefined_templates_exist() {
        let library = StepLibrary::with_predefined();

        assert!(library.get("single").is_some());
        assert!(library.get("multi_adjudication").is_some());
        assert!(library.get("review_required").is_some());
        assert!(library.get("iterative_refinement").is_some());
        assert!(library.get("adjudication").is_some());
    }

    #[test]
    fn test_resolve_template() {
        let library = StepLibrary::with_predefined();
        let step = library.resolve("step_1", "single", None).unwrap();

        assert_eq!(step.id, "step_1");
        assert_eq!(step.step_type, StepType::Annotation);
        assert_eq!(step.settings.min_annotators, Some(1));
    }

    #[test]
    fn test_resolve_with_overrides() {
        let library = StepLibrary::with_predefined();
        let overrides = serde_json::json!({
            "timeout_minutes": 60,
            "min_annotators": 5
        });

        let step = library
            .resolve("step_1", "single", Some(&overrides))
            .unwrap();

        assert_eq!(step.settings.timeout_minutes, Some(60));
        assert_eq!(step.settings.min_annotators, Some(5));
    }

    #[test]
    fn test_template_not_found() {
        let library = StepLibrary::with_predefined();
        let result = library.resolve("step_1", "nonexistent", None);

        assert!(matches!(result, Err(ConfigError::TemplateNotFound(_))));
    }
}
