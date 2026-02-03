//! YAML workflow configuration types
//!
//! These types are deserialized from YAML workflow definitions and validated
//! before being stored. They represent the user-facing workflow configuration format.

use serde::{Deserialize, Serialize};

use glyph_domain::enums::{StepType, WorkflowType};

// =============================================================================
// Root Configuration
// =============================================================================

/// Root workflow configuration parsed from YAML
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct WorkflowConfig {
    /// Configuration version (e.g., "1.0")
    pub version: String,

    /// Human-readable workflow name
    pub name: String,

    /// Type of workflow (single, multi_adjudication, custom)
    pub workflow_type: WorkflowType,

    /// Global workflow settings
    #[serde(default)]
    pub settings: WorkflowSettingsConfig,

    /// Step definitions
    pub steps: Vec<StepConfig>,

    /// Transitions between steps
    pub transitions: Vec<TransitionConfig>,

    /// Optional step library references for this workflow
    #[serde(default)]
    pub step_library: Vec<StepLibraryRef>,
}

// =============================================================================
// Step Configuration
// =============================================================================

/// Configuration for a single workflow step
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct StepConfig {
    /// Unique step identifier within the workflow
    pub id: String,

    /// Human-readable step name
    pub name: String,

    /// Type of step (annotation, review, adjudication, etc.)
    pub step_type: StepType,

    /// Step-specific settings
    #[serde(default)]
    pub settings: StepSettingsConfig,

    /// Reference to a step library template (optional)
    #[serde(default)]
    pub ref_name: Option<String>,

    /// Overrides for step library template (optional)
    #[serde(default)]
    pub overrides: Option<serde_json::Value>,
}

/// Settings for a workflow step
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct StepSettingsConfig {
    /// Timeout in minutes (default 120, max 480 per CONTEXT.md)
    #[serde(default)]
    pub timeout_minutes: Option<u32>,

    /// Visibility mode for annotators
    #[serde(default)]
    pub visibility: Option<Visibility>,

    /// Required roles for assignment
    #[serde(default)]
    pub required_roles: Option<Vec<String>>,

    /// Handler name for auto_process steps
    #[serde(default)]
    pub handler: Option<String>,

    /// Condition expression for conditional steps
    #[serde(default)]
    pub condition: Option<String>,

    /// Sub-workflow ID for sub_workflow steps
    #[serde(default)]
    pub sub_workflow_id: Option<String>,

    /// Minimum number of annotators required
    #[serde(default)]
    pub min_annotators: Option<u32>,

    /// Agreement metric for consensus calculation
    #[serde(default)]
    pub agreement_metric: Option<AgreementMetric>,

    /// Threshold for consensus (0.0 to 1.0)
    #[serde(default)]
    pub threshold: Option<f64>,

    /// Whether previous annotations are visible
    #[serde(default)]
    pub show_previous: Option<bool>,

    /// Required skills for this step
    #[serde(default)]
    pub required_skills: Option<Vec<String>>,
}

// =============================================================================
// Transition Configuration
// =============================================================================

/// Configuration for a transition between steps
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct TransitionConfig {
    /// Source step ID
    pub from: String,

    /// Destination step ID (use "_complete" or "_failed" for terminal states)
    pub to: String,

    /// Condition for this transition (defaults to "always")
    #[serde(default)]
    pub condition: Option<TransitionConditionConfig>,
}

/// Condition configuration for a transition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct TransitionConditionConfig {
    /// Type of condition: always, on_complete, on_agreement, on_disagreement, expression
    #[serde(rename = "type")]
    pub condition_type: String,

    /// Expression for "expression" condition type
    #[serde(default)]
    pub expression: Option<String>,

    /// Threshold for agreement conditions
    #[serde(default)]
    pub threshold: Option<f64>,
}

// =============================================================================
// Workflow Settings
// =============================================================================

/// Global workflow settings
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct WorkflowSettingsConfig {
    /// Minimum annotators at workflow level (can be overridden per step)
    #[serde(default)]
    pub min_annotators: Option<u32>,

    /// Default consensus threshold
    #[serde(default)]
    pub consensus_threshold: Option<f64>,

    /// Tie-breaker strategy for equal votes
    #[serde(default)]
    pub tie_breaker: Option<TieBreaker>,

    /// Field-level consensus mode
    #[serde(default)]
    pub field_level_consensus: Option<FieldConsensus>,

    /// Default timeout in minutes
    #[serde(default)]
    pub default_timeout_minutes: Option<u32>,

    /// Maximum retries for failed steps
    #[serde(default)]
    pub max_retries: Option<u32>,
}

// =============================================================================
// Step Library Reference
// =============================================================================

/// Reference to a step library template
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct StepLibraryRef {
    /// Name of the template to use
    pub ref_name: String,

    /// Overrides for the template
    #[serde(default)]
    pub overrides: Option<serde_json::Value>,
}

// =============================================================================
// Enums
// =============================================================================

/// Visibility mode for annotators
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Visibility {
    /// Annotators cannot see each other's work (default per CONTEXT.md)
    Blind,
    /// Annotators can see each other's work
    Collaborative,
}

impl Default for Visibility {
    fn default() -> Self {
        Self::Blind // Per CONTEXT.md: fully blind by default
    }
}

/// Agreement metric for consensus calculation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgreementMetric {
    /// Cohen's Kappa for 2 annotators
    CohensKappa,
    /// Krippendorff's Alpha for multiple annotators
    KrippendorffsAlpha,
    /// Intersection over Union for spans/boxes
    Iou,
    /// Simple percentage agreement
    PercentAgreement,
    /// Majority vote (no statistical measure)
    MajorityVote,
}

/// Tie-breaker strategy when votes are equal
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TieBreaker {
    /// Use first annotation by time
    FirstAnnotation,
    /// Use last annotation by time
    LastAnnotation,
    /// Escalate to adjudication
    Escalate,
    /// Use annotator with highest quality score
    HighestQuality,
    /// Random selection
    Random,
}

/// Field-level consensus mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FieldConsensus {
    /// All fields must agree
    AllFields,
    /// Consensus per field (some may disagree)
    PerField,
    /// Only specified fields require consensus
    SelectedFields,
}
