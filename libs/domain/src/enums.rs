//! All enum types for the Glyph platform
//!
//! These enums are the source of truth and must match the SQL enum types exactly.
//! They use `#[typeshare]` to generate TypeScript types.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

// =============================================================================
// Core Status Enums
// =============================================================================

/// Status of a user account
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
    Deleted,
}

/// Status of a task in the workflow
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Assigned,
    InProgress,
    Review,
    Adjudication,
    Completed,
    Failed,
    Cancelled,
    Deleted,
}

/// Status of an annotation
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnnotationStatus {
    Draft,
    Submitted,
    Approved,
    Rejected,
    Superseded,
    Deleted,
}

/// Status of a task assignment
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssignmentStatus {
    Assigned,
    Accepted,
    InProgress,
    Submitted,
    Expired,
    Reassigned,
    Rejected,
}

/// Type of workflow step
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepType {
    Annotation,
    Review,
    Adjudication,
    AutoProcess,
    Conditional,
    SubWorkflow,
}

/// Status of a workflow step
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepStatus {
    Pending,
    Active,
    Completed,
    Skipped,
}

/// Type of actor performing an action
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActorType {
    User,
    System,
    Api,
}

/// Status of a project
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectStatus {
    Draft,
    Active,
    Paused,
    Completed,
    Archived,
    Deleted,
}

/// Type of project goal
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GoalType {
    Volume,
    Quality,
    Deadline,
    Duration,
    Composite,
    Manual,
}

/// Entity type for quality scoring
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QualityEntityType {
    Task,
    Annotation,
    User,
    Project,
}

// =============================================================================
// Workflow Configuration Enums
// =============================================================================

/// Type of workflow
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowType {
    Single,
    MultiAdjudication,
    Custom,
}

/// Criteria for step completion
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompletionCriteriaType {
    AnnotationCount,
    ReviewDecision,
    Auto,
    Manual,
}

/// Method for reaching consensus
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConsensusMethod {
    MajorityVote,
    WeightedVote,
    Unanimous,
}

/// Strategy for resolving disagreements
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResolutionStrategy {
    MajorityVote,
    WeightedVote,
    Adjudication,
    AdditionalAnnotators,
    Escalate,
}

/// Mode for task assignment
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssignmentMode {
    Auto,
    Manual,
    Pool,
}

/// Strategy for load balancing assignments
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LoadBalancingStrategy {
    RoundRobin,
    LeastLoaded,
    QualityWeighted,
}

/// Type of contribution to a goal
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContributionType {
    Count,
    QualityMetric,
    Progress,
}

/// Type of aggregation for metrics
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AggregationType {
    Sum,
    Latest,
    Average,
    Min,
    Max,
}

/// Type of condition for workflow transitions
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransitionConditionType {
    Always,
    OnComplete,
    OnAgreement,
    OnDisagreement,
    Expression,
}

/// Action to take on timeout
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimeoutAction {
    Proceed,
    Retry,
    Escalate,
}

/// Proficiency level of a user
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProficiencyLevel {
    Novice,
    Intermediate,
    Advanced,
    Expert,
}

/// Status of a user's skill certification
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SkillStatus {
    Active,
    SoftExpired,
    HardExpired,
    NeverExpires,
}
