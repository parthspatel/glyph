//! Workflow domain models

use serde::{Deserialize, Serialize};
use typeshare::typeshare;
use uuid::Uuid;

use crate::enums::{
    AssignmentMode, CompletionCriteriaType, ConsensusMethod, LoadBalancingStrategy,
    ResolutionStrategy, StepType, TimeoutAction, TransitionConditionType, WorkflowType,
};

/// A workflow definition
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub workflow_id: Uuid,
    pub name: String,
    pub workflow_type: WorkflowType,
    pub entry_step_id: String,
    pub exit_step_ids: Vec<String>,
    pub steps: Vec<WorkflowStep>,
    pub transitions: Vec<WorkflowTransition>,
    pub settings: WorkflowSettings,
    pub hooks: WorkflowHooks,
}

/// A step in the workflow
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub step_id: String,
    pub name: String,
    pub step_type: StepType,
    pub completion_criteria: CompletionCriteria,
    pub assignment: AssignmentConfig,
    pub consensus: Option<ConsensusConfig>,
    pub timeout: Option<TimeoutConfig>,
    pub ui: Option<StepUiConfig>,
}

/// Criteria for completing a step
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionCriteria {
    pub criteria_type: CompletionCriteriaType,
    pub required_count: Option<i32>,
    pub min_agreement: Option<f64>,
}

/// Configuration for task assignment
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignmentConfig {
    pub mode: AssignmentMode,
    pub load_balancing: LoadBalancingStrategy,
    pub required_skills: Vec<String>,
    pub exclude_previous_annotators: bool,
}

/// Configuration for consensus handling
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusConfig {
    pub method: ConsensusMethod,
    pub threshold: f64,
    pub on_agreement: ResolutionStrategy,
    pub on_disagreement: ResolutionStrategy,
}

/// Configuration for step timeout
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeoutConfig {
    pub duration_seconds: i64,
    pub action: TimeoutAction,
    pub max_retries: Option<i32>,
}

/// UI configuration for a step
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepUiConfig {
    pub layout_override: Option<String>,
    pub show_previous: bool,
    pub show_context: bool,
    pub editable_fields: Option<Vec<String>>,
}

/// A transition between workflow steps
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTransition {
    pub from_step_id: String,
    pub to_step_id: String,
    pub condition: TransitionCondition,
}

/// Condition for a workflow transition
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionCondition {
    pub condition_type: TransitionConditionType,
    pub expression: Option<String>,
}

/// Global workflow settings
#[typeshare]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WorkflowSettings {
    pub allow_parallel_steps: bool,
    pub max_retries: i32,
    pub default_timeout_seconds: Option<i64>,
}

/// Workflow-level hooks
#[typeshare]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WorkflowHooks {
    pub on_start: Vec<String>,
    pub on_complete: Vec<String>,
}
