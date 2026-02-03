//! Workflow orchestrator
//!
//! Integrates all workflow engine components: parser, state machine,
//! executors, transitions, goals, and event sourcing.

use std::sync::Arc;

use async_trait::async_trait;
use chrono::Utc;
use glyph_domain::enums::StepType;
use thiserror::Error;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::config::{StepLibrary, WorkflowConfig};
use crate::events::{EventEmitter, EventStore, EventStoreError, PgEventStore, StateRebuilder};
use crate::executor::{
    create_executor, AnnotationData, ExecutionContext, ExecutionResult, ExecutorError,
    HandlerRegistry,
};
use crate::goals::GoalTracker;
use crate::parser::{parse_workflow_with_library, ParseError, ValidationError};
use crate::state::{StateTransitionError, WorkflowStateManager};
use crate::transition::{ConditionError, TransitionEvaluator};

// =============================================================================
// Errors
// =============================================================================

/// Orchestration errors
#[derive(Debug, Error)]
pub enum OrchestrationError {
    /// Workflow configuration not found
    #[error("Workflow config not found: {0}")]
    ConfigNotFound(Uuid),

    /// Parse error
    #[error("Parse error: {0}")]
    ParseError(#[from] ParseError),

    /// Validation error
    #[error("Validation error: {0}")]
    ValidationError(#[from] ValidationError),

    /// Execution error
    #[error("Execution error: {0}")]
    ExecutionError(#[from] ExecutorError),

    /// Event store error
    #[error("Event store error: {0}")]
    EventStoreError(#[from] EventStoreError),

    /// State transition error
    #[error("State transition error: {0}")]
    StateError(#[from] StateTransitionError),

    /// Condition evaluation error
    #[error("Condition error: {0}")]
    ConditionError(#[from] ConditionError),

    /// Storage error
    #[error("Storage error: {0}")]
    StorageError(String),

    /// Task not found
    #[error("Task not found: {0}")]
    TaskNotFound(Uuid),

    /// Step not found
    #[error("Step not found: {0}")]
    StepNotFound(String),

    /// Workflow already started
    #[error("Workflow already started for task: {0}")]
    AlreadyStarted(Uuid),

    /// Invalid state
    #[error("Invalid workflow state: {0}")]
    InvalidState(String),

    /// No steps defined
    #[error("Workflow has no steps defined")]
    NoStepsDefined,
}

// =============================================================================
// Process Result
// =============================================================================

/// Result of processing a submission
#[derive(Debug, Clone)]
pub enum ProcessResult {
    /// Waiting for more submissions
    Waiting { step_id: String, reason: String },

    /// Advanced to next step
    Advanced { from_step: String, to_step: String },

    /// Workflow completed
    Completed { final_output: serde_json::Value },

    /// Step or workflow failed
    Failed { error: String, recoverable: bool },
}

// =============================================================================
// Config Store Trait
// =============================================================================

/// Trait for storing workflow configurations
#[async_trait]
pub trait WorkflowConfigStore: Send + Sync {
    /// Save a workflow configuration
    async fn save(&self, config: &WorkflowConfig) -> Result<Uuid, OrchestrationError>;

    /// Load a workflow configuration by ID
    async fn load(&self, id: Uuid) -> Result<WorkflowConfig, OrchestrationError>;

    /// Load a workflow configuration by name
    async fn load_by_name(&self, name: &str) -> Result<WorkflowConfig, OrchestrationError>;
}

// =============================================================================
// In-Memory Config Store
// =============================================================================

/// Simple in-memory config store for development/testing
pub struct InMemoryConfigStore {
    configs: Mutex<std::collections::HashMap<Uuid, WorkflowConfig>>,
}

impl InMemoryConfigStore {
    /// Create a new in-memory config store
    #[must_use]
    pub fn new() -> Self {
        Self {
            configs: Mutex::new(std::collections::HashMap::new()),
        }
    }
}

impl Default for InMemoryConfigStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl WorkflowConfigStore for InMemoryConfigStore {
    async fn save(&self, config: &WorkflowConfig) -> Result<Uuid, OrchestrationError> {
        let id = Uuid::new_v4();
        let mut configs = self.configs.lock().await;
        configs.insert(id, config.clone());
        Ok(id)
    }

    async fn load(&self, id: Uuid) -> Result<WorkflowConfig, OrchestrationError> {
        let configs = self.configs.lock().await;
        configs
            .get(&id)
            .cloned()
            .ok_or(OrchestrationError::ConfigNotFound(id))
    }

    async fn load_by_name(&self, name: &str) -> Result<WorkflowConfig, OrchestrationError> {
        let configs = self.configs.lock().await;
        configs
            .values()
            .find(|c| c.name == name)
            .cloned()
            .ok_or_else(|| OrchestrationError::StorageError(format!("Config not found: {name}")))
    }
}

// =============================================================================
// Workflow Orchestrator
// =============================================================================

/// Main workflow orchestrator that integrates all components
pub struct WorkflowOrchestrator {
    /// Workflow configuration storage
    config_store: Arc<dyn WorkflowConfigStore>,

    /// Event store for persistence
    event_store: Arc<dyn EventStore>,

    /// Handler registry for auto-process steps
    handler_registry: Arc<HandlerRegistry>,

    /// Goal tracker for project goals
    #[allow(dead_code)]
    goal_tracker: Arc<Mutex<GoalTracker>>,

    /// Step library with predefined templates
    step_library: Arc<StepLibrary>,

    /// State rebuilder for event replay
    state_rebuilder: StateRebuilder,
}

impl WorkflowOrchestrator {
    /// Create a new workflow orchestrator
    #[must_use]
    pub fn new(
        config_store: Arc<dyn WorkflowConfigStore>,
        event_store: Arc<dyn EventStore>,
    ) -> Self {
        // Initialize handler registry with builtins
        let handler_registry = Arc::new(HandlerRegistry::with_builtins());

        // Initialize goal tracker
        let goal_tracker = Arc::new(Mutex::new(GoalTracker::new()));

        // Initialize step library
        let step_library = Arc::new(StepLibrary::with_predefined());

        // Create state rebuilder
        let state_rebuilder = StateRebuilder::new(Arc::clone(&event_store));

        Self {
            config_store,
            event_store,
            handler_registry,
            goal_tracker,
            step_library,
            state_rebuilder,
        }
    }

    /// Create orchestrator with PostgreSQL event store
    #[must_use]
    pub fn with_pg(config_store: Arc<dyn WorkflowConfigStore>, pool: sqlx::PgPool) -> Self {
        let event_store = Arc::new(PgEventStore::new(pool));
        Self::new(config_store, event_store)
    }

    /// Get the entry step ID (first step in the workflow)
    fn get_entry_step(config: &WorkflowConfig) -> Result<&str, OrchestrationError> {
        config
            .steps
            .first()
            .map(|s| s.id.as_str())
            .ok_or(OrchestrationError::NoStepsDefined)
    }

    // =========================================================================
    // Workflow Configuration
    // =========================================================================

    /// Parse and store a workflow from YAML
    pub async fn create_workflow(&self, yaml: &str) -> Result<WorkflowConfig, OrchestrationError> {
        // Parse YAML with step library
        let config = parse_workflow_with_library(yaml, &self.step_library)?;

        // Store configuration
        self.config_store.save(&config).await?;

        Ok(config)
    }

    /// Get a workflow configuration by ID
    pub async fn get_workflow(&self, id: Uuid) -> Result<WorkflowConfig, OrchestrationError> {
        self.config_store.load(id).await
    }

    // =========================================================================
    // Task Lifecycle
    // =========================================================================

    /// Start a workflow for a task
    pub async fn start_task(
        &self,
        task_id: Uuid,
        workflow_id: Uuid,
    ) -> Result<WorkflowStateManager, OrchestrationError> {
        // Load workflow config
        let config = self.config_store.load(workflow_id).await?;

        // Get entry step (first step)
        let entry_step = Self::get_entry_step(&config)?;

        // Build list of step IDs
        let step_ids: Vec<&str> = config.steps.iter().map(|s| s.id.as_str()).collect();

        // Create initial state
        let mut state = WorkflowStateManager::new(entry_step, &step_ids);

        // Create event emitter
        let emitter = EventEmitter::new(Arc::clone(&self.event_store), task_id, "workflow");

        // Emit workflow started event
        emitter
            .workflow_started(workflow_id, &config.version)
            .await?;

        // Activate entry step
        state.activate_step(entry_step, vec![])?;

        // Emit step activated event
        emitter.step_activated(entry_step, vec![]).await?;

        Ok(state)
    }

    /// Process an annotation submission for a task
    pub async fn process_submission(
        &self,
        task_id: Uuid,
        workflow_id: Uuid,
        step_id: &str,
        submission: serde_json::Value,
        user_id: Uuid,
    ) -> Result<ProcessResult, OrchestrationError> {
        // Load workflow config
        let config = self.config_store.load(workflow_id).await?;

        // Rebuild state from events
        let step_ids: Vec<&str> = config.steps.iter().map(|s| s.id.as_str()).collect();
        let mut state = self
            .state_rebuilder
            .rebuild_state(task_id, &step_ids)
            .await
            .map_err(|e| OrchestrationError::StorageError(e.to_string()))?;

        // Verify we're on the right step
        if state.current_step() != Some(step_id) {
            return Err(OrchestrationError::InvalidState(format!(
                "Expected step {}, but current step is {:?}",
                step_id,
                state.current_step()
            )));
        }

        // Find step config
        let step_config = config
            .steps
            .iter()
            .find(|s| s.id == step_id)
            .ok_or_else(|| OrchestrationError::StepNotFound(step_id.to_string()))?;

        // Create annotation data from submission
        let annotation = AnnotationData {
            annotation_id: Uuid::new_v4(),
            user_id,
            data: submission.clone(),
            submitted_at: Utc::now(),
            decision: None,
        };

        // Create execution context
        let mut ctx = ExecutionContext::new(task_id, step_id.to_string(), step_config, &state);
        ctx = ctx.with_annotations(vec![annotation]);
        ctx = ctx.with_user(user_id, vec![]);

        // Create and execute step
        let executor = create_executor(step_config, Arc::clone(&self.handler_registry), 0)?;

        let result = executor.execute(&ctx).await?;

        // Create event emitter
        let emitter = EventEmitter::new(Arc::clone(&self.event_store), task_id, "workflow");

        match result {
            ExecutionResult::Complete {
                result: step_result,
            } => {
                // Complete the step
                state.complete_step(step_id, step_result.clone())?;

                // Emit step completed event
                emitter.step_completed(step_id, step_result.clone()).await?;

                // Evaluate transitions using TransitionEvaluator
                let evaluator = TransitionEvaluator::new(&config);
                let next_step = evaluator.evaluate_next_step(
                    step_id,
                    &state,
                    Some(&step_result),
                    None, // No consensus score
                );

                // Handle transition result
                match next_step {
                    Ok(Some(next)) => {
                        // Emit transition event
                        emitter.transition_occurred(step_id, &next, None).await?;

                        // Activate next step
                        state.activate_step(&next, vec![])?;
                        state.transition_to(&next, "condition_met")?;

                        // Emit step activated event
                        emitter.step_activated(&next, vec![]).await?;

                        Ok(ProcessResult::Advanced {
                            from_step: step_id.to_string(),
                            to_step: next,
                        })
                    }
                    Ok(None) => {
                        // Workflow complete (terminal state reached)
                        state.complete_workflow("all_steps_complete");

                        let output = serde_json::json!({"status": "completed"});
                        emitter.workflow_completed(output.clone()).await?;

                        Ok(ProcessResult::Completed {
                            final_output: output,
                        })
                    }
                    Err(_) => {
                        // No matching transition - workflow complete
                        state.complete_workflow("no_matching_transition");

                        let output = serde_json::json!({"status": "completed"});
                        emitter.workflow_completed(output.clone()).await?;

                        Ok(ProcessResult::Completed {
                            final_output: output,
                        })
                    }
                }
            }

            ExecutionResult::Waiting { reason } => {
                // Record activity
                state.record_activity(step_id)?;

                Ok(ProcessResult::Waiting {
                    step_id: step_id.to_string(),
                    reason,
                })
            }

            ExecutionResult::Failed { error, retryable } => {
                if !retryable {
                    state.fail_step(step_id, &error)?;
                    emitter.step_failed(step_id, &error, 0).await?;
                }

                Ok(ProcessResult::Failed {
                    error,
                    recoverable: retryable,
                })
            }
        }
    }

    /// Advance a task's workflow (for auto-process steps)
    pub async fn advance_task(
        &self,
        task_id: Uuid,
        workflow_id: Uuid,
    ) -> Result<Option<String>, OrchestrationError> {
        // Load workflow config
        let config = self.config_store.load(workflow_id).await?;

        // Rebuild state
        let step_ids: Vec<&str> = config.steps.iter().map(|s| s.id.as_str()).collect();
        let state = self
            .state_rebuilder
            .rebuild_state(task_id, &step_ids)
            .await
            .map_err(|e| OrchestrationError::StorageError(e.to_string()))?;

        // Get current step
        let current_step_id = state
            .current_step()
            .ok_or_else(|| OrchestrationError::InvalidState("Workflow complete".to_string()))?;

        // Find step config
        let step_config = config
            .steps
            .iter()
            .find(|s| s.id == current_step_id)
            .ok_or_else(|| OrchestrationError::StepNotFound(current_step_id.to_string()))?;

        // Only auto-advance auto-process steps
        if step_config.step_type != StepType::AutoProcess {
            return Ok(Some(current_step_id.to_string()));
        }

        // Process with empty submission
        let result = self
            .process_submission(
                task_id,
                workflow_id,
                current_step_id,
                serde_json::json!({}),
                Uuid::nil(), // System user
            )
            .await?;

        match result {
            ProcessResult::Advanced { to_step, .. } => Ok(Some(to_step)),
            ProcessResult::Completed { .. } => Ok(None),
            ProcessResult::Waiting { step_id, .. } => Ok(Some(step_id)),
            ProcessResult::Failed { error, .. } => Err(OrchestrationError::InvalidState(error)),
        }
    }

    /// Get current task state
    pub async fn get_task_state(
        &self,
        task_id: Uuid,
        workflow_id: Uuid,
    ) -> Result<WorkflowStateManager, OrchestrationError> {
        let config = self.config_store.load(workflow_id).await?;
        let step_ids: Vec<&str> = config.steps.iter().map(|s| s.id.as_str()).collect();

        self.state_rebuilder
            .rebuild_state(task_id, &step_ids)
            .await
            .map_err(|e| OrchestrationError::StorageError(e.to_string()))
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_result_variants() {
        let waiting = ProcessResult::Waiting {
            step_id: "review".to_string(),
            reason: "waiting for reviewers".to_string(),
        };
        assert!(matches!(waiting, ProcessResult::Waiting { .. }));

        let completed = ProcessResult::Completed {
            final_output: serde_json::json!({"status": "done"}),
        };
        assert!(matches!(completed, ProcessResult::Completed { .. }));
    }

    #[test]
    fn test_in_memory_config_store() {
        // Basic struct test - async tests would need tokio runtime
        let store = InMemoryConfigStore::new();
        assert!(store.configs.try_lock().is_ok());
    }

    #[test]
    fn test_orchestration_error_display() {
        let err = OrchestrationError::ConfigNotFound(Uuid::nil());
        assert!(err.to_string().contains("not found"));

        let err = OrchestrationError::StepNotFound("review".to_string());
        assert!(err.to_string().contains("review"));
    }
}
