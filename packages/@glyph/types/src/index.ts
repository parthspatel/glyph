/**
 * @glyph/types - Shared TypeScript types for the Glyph platform
 *
 * This package contains types generated from Rust via typeshare,
 * plus additional TypeScript-specific types.
 */

// Re-export generated types (will be created by typeshare)
// export * from './generated';

// =============================================================================
// Core Status Enums (matching Rust enums)
// =============================================================================

export type UserStatus = "active" | "inactive" | "suspended" | "deleted";

export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "review"
  | "adjudication"
  | "completed"
  | "failed"
  | "cancelled"
  | "deleted";

export type AnnotationStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "superseded"
  | "deleted";

export type AssignmentStatus =
  | "assigned"
  | "accepted"
  | "in_progress"
  | "submitted"
  | "expired"
  | "reassigned";

export type StepType =
  | "annotation"
  | "review"
  | "adjudication"
  | "auto_process"
  | "conditional"
  | "sub_workflow";

export type StepStatus = "pending" | "active" | "completed" | "skipped";

export type ActorType = "user" | "system" | "api";

export type ProjectStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived"
  | "deleted";

export type TeamStatus = "active" | "inactive" | "deleted";

export type TeamRole = "leader" | "manager" | "member";

export type GoalType =
  | "volume"
  | "quality"
  | "deadline"
  | "duration"
  | "composite"
  | "manual";

export type QualityEntityType = "task" | "annotation" | "user" | "project";

// =============================================================================
// Workflow Configuration Enums
// =============================================================================

export type WorkflowType = "single" | "multi_adjudication" | "custom";

export type CompletionCriteriaType =
  | "annotation_count"
  | "review_decision"
  | "auto"
  | "manual";

export type ConsensusMethod = "majority_vote" | "weighted_vote" | "unanimous";

export type ResolutionStrategy =
  | "majority_vote"
  | "weighted_vote"
  | "adjudication"
  | "additional_annotators"
  | "escalate";

export type AssignmentMode = "auto" | "manual" | "pool";

export type LoadBalancingStrategy =
  | "round_robin"
  | "least_loaded"
  | "quality_weighted";

export type ContributionType = "count" | "quality_metric" | "progress";

export type AggregationType = "sum" | "latest" | "average" | "min" | "max";

export type TransitionConditionType =
  | "always"
  | "on_complete"
  | "on_agreement"
  | "on_disagreement"
  | "expression";

export type TimeoutAction = "proceed" | "retry" | "escalate";

export type ProficiencyLevel =
  | "novice"
  | "intermediate"
  | "advanced"
  | "expert";

// =============================================================================
// Core Interfaces
// =============================================================================

export interface User {
  user_id: string;
  email: string;
  display_name: string;
  status: UserStatus;
  skills: UserSkill[];
  roles: string[];
  quality_profile: QualityProfile;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  skill_id: string;
  proficiency: ProficiencyLevel;
  verified: boolean;
  verified_at?: string;
}

export interface QualityProfile {
  overall_score?: number;
  accuracy_score?: number;
  consistency_score?: number;
  speed_percentile?: number;
  total_annotations: number;
  approved_annotations: number;
  rejected_annotations: number;
}

export interface Task {
  task_id: string;
  project_id: string;
  status: TaskStatus;
  priority: number;
  input_data: Record<string, unknown>;
  workflow_state: WorkflowState;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface WorkflowState {
  current_step_id?: string;
  step_states: StepState[];
  history: WorkflowHistoryEntry[];
}

export interface StepState {
  step_id: string;
  status: StepStatus;
  started_at?: string;
  completed_at?: string;
  retry_count: number;
}

export interface WorkflowHistoryEntry {
  from_step_id?: string;
  to_step_id: string;
  transition_reason: string;
  occurred_at: string;
}

export interface Annotation {
  annotation_id: string;
  task_id: string;
  step_id: string;
  user_id: string;
  assignment_id: string;
  project_id: string;
  data: Record<string, unknown>;
  status: AnnotationStatus;
  version: number;
  parent_version_id?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  quality_score?: number;
  quality_evaluated_at?: string;
  time_spent_ms?: number;
  client_metadata?: Record<string, unknown>;
}

export interface Project {
  project_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  workflow_id: string;
  layout_id: string;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ProjectSettings {
  allow_self_review: boolean;
  require_all_fields: boolean;
  max_assignments_per_user?: number;
  assignment_timeout_hours?: number;
  quality_threshold?: number;
}

export interface Workflow {
  workflow_id: string;
  name: string;
  workflow_type: WorkflowType;
  entry_step_id: string;
  exit_step_ids: string[];
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
  settings: WorkflowSettings;
  hooks: WorkflowHooks;
}

export interface WorkflowStep {
  step_id: string;
  name: string;
  step_type: StepType;
  completion_criteria: CompletionCriteria;
  assignment: AssignmentConfig;
  consensus?: ConsensusConfig;
  timeout?: TimeoutConfig;
  ui?: StepUiConfig;
}

export interface CompletionCriteria {
  criteria_type: CompletionCriteriaType;
  required_count?: number;
  min_agreement?: number;
}

export interface AssignmentConfig {
  mode: AssignmentMode;
  load_balancing: LoadBalancingStrategy;
  required_skills: string[];
  exclude_previous_annotators: boolean;
}

export interface ConsensusConfig {
  method: ConsensusMethod;
  threshold: number;
  on_agreement: ResolutionStrategy;
  on_disagreement: ResolutionStrategy;
}

export interface TimeoutConfig {
  duration_seconds: number;
  action: TimeoutAction;
  max_retries?: number;
}

export interface StepUiConfig {
  layout_override?: string;
  show_previous: boolean;
  show_context: boolean;
  editable_fields?: string[];
}

export interface WorkflowTransition {
  from_step_id: string;
  to_step_id: string;
  condition: TransitionCondition;
}

export interface TransitionCondition {
  condition_type: TransitionConditionType;
  expression?: string;
}

export interface WorkflowSettings {
  allow_parallel_steps: boolean;
  max_retries: number;
  default_timeout_seconds?: number;
}

export interface WorkflowHooks {
  on_start: string[];
  on_complete: string[];
}

// =============================================================================
// Team Types (new in Phase 2)
// =============================================================================

export interface Team {
  team_id: string;
  name: string;
  description?: string;
  leader_id: string;
  status: TeamStatus;
  capacity?: number;
  specializations: string[];
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  team_id: string;
  user_id: string;
  role: TeamRole;
  allocation_percentage?: number;
  joined_at: string;
}

// =============================================================================
// Pagination Types (new in Phase 2)
// =============================================================================

export type SortOrder = "asc" | "desc";

export interface Pagination {
  limit: number;
  offset: number;
  sort_by?: string;
  sort_order: SortOrder;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// ID Types (new in Phase 2 - prefixed format)
// =============================================================================

/** User ID in format: user_{uuid} */
export type UserId = string;

/** Team ID in format: team_{uuid} */
export type TeamId = string;

/** Project ID in format: proj_{uuid} */
export type ProjectId = string;

/** Task ID in format: task_{uuid} */
export type TaskId = string;

/** Annotation ID in format: annot_{uuid} */
export type AnnotationId = string;

/** Workflow ID in format: wf_{uuid} */
export type WorkflowId = string;

/** Assignment ID in format: asgn_{uuid} */
export type AssignmentId = string;

/** Quality Score ID in format: score_{uuid} */
export type QualityScoreId = string;
