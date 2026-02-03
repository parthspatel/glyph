//! Step executors for workflow execution
//!
//! Provides the StepExecutor trait and implementations for all step types:
//! - Annotation: Collects annotations from assigned users
//! - Review: Accepts or rejects submitted work
//! - Adjudication: Resolves disagreements between annotators
//! - AutoProcess: Runs handlers with retry logic
//! - Conditional: Evaluates expressions to choose branches
//! - SubWorkflow: Executes nested workflows

pub mod adjudication;
pub mod annotation;
pub mod auto_process;
pub mod conditional;
pub mod handlers;
pub mod review;
pub mod sub_workflow;
pub mod traits;

pub use adjudication::*;
pub use annotation::*;
pub use auto_process::*;
pub use conditional::*;
pub use handlers::*;
pub use review::*;
pub use sub_workflow::*;
pub use traits::*;

use std::sync::Arc;

use glyph_domain::enums::StepType;

use crate::config::StepConfig;

/// Create an executor for a step based on its type
///
/// # Arguments
/// * `step_config` - Configuration for the step
/// * `registry` - Handler registry for auto-process steps
/// * `depth` - Current recursion depth for sub-workflows
pub fn create_executor(
    step_config: &StepConfig,
    registry: Arc<HandlerRegistry>,
    depth: u8,
) -> Result<Box<dyn StepExecutor>, ExecutorError> {
    match step_config.step_type {
        StepType::Annotation => Ok(Box::new(AnnotationStepExecutor::new(step_config)?)),
        StepType::Review => Ok(Box::new(ReviewStepExecutor::new(step_config)?)),
        StepType::Adjudication => Ok(Box::new(AdjudicationStepExecutor::new(step_config)?)),
        StepType::AutoProcess => Ok(Box::new(AutoProcessStepExecutor::new(
            step_config,
            registry,
        )?)),
        StepType::Conditional => Ok(Box::new(ConditionalStepExecutor::new(step_config)?)),
        StepType::SubWorkflow => Ok(Box::new(SubWorkflowStepExecutor::new(step_config, depth)?)),
    }
}
