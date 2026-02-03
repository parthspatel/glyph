//! Workflow engine for Glyph
//!
//! Provides workflow state machine, step execution, transitions,
//! consensus calculation, goal tracking, and event sourcing.
//!
//! # Main Components
//!
//! - [`WorkflowOrchestrator`] - Main orchestrator integrating all components
//! - [`WorkflowConfig`] - Workflow configuration parsed from YAML
//! - [`WorkflowStateManager`] - Manages workflow execution state
//! - [`StepExecutor`] - Trait for step execution
//! - [`EventStore`] - Event sourcing storage
//! - [`GoalTracker`] - Goal tracking with debouncing

// Module declarations
pub mod assignment;
pub mod config;
pub mod consensus;
pub mod engine;
pub mod events;
pub mod executor;
pub mod goals;
pub mod parser;
pub mod state;
pub mod transition;

// Re-export key types at crate root for convenience
// Note: Using selective exports to avoid glob ambiguities

// Config types
pub use config::{StepConfig, StepLibrary, TransitionConfig, WorkflowConfig};

// Parser
pub use parser::{parse_workflow, parse_workflow_with_library, ParseError, ValidationError};

// State
pub use state::{StepResult, StepState, WorkflowSnapshot, WorkflowStateManager};

// Transitions
pub use transition::{ConditionError, TransitionEvaluator};

// Consensus
pub use consensus::{cohens_kappa, iou_span, krippendorffs_alpha_nominal, ConsensusError};

// Executors
pub use executor::{
    create_executor, ExecutionContext, ExecutionResult, ExecutorError, HandlerRegistry,
    StepExecutor,
};

// Goals
pub use goals::{CompletionAction, GoalEvaluator, GoalTracker};

// Events
pub use events::{EventStore, PgEventStore, StateRebuilder, StoredEvent, WorkflowEvent};

// Engine (orchestrator)
pub use engine::{
    InMemoryConfigStore, OrchestrationError, ProcessResult, WorkflowConfigStore,
    WorkflowOrchestrator,
};
