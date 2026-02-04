/**
 * API module exports.
 * Re-exports all API clients and types for convenient importing.
 */

export { api, ApiError } from "./client";
export { projectsApi } from "./projects";
export type {
  Project,
  ProjectStatus,
  ProjectListResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilter,
  CloneProjectOptions,
} from "./projects";
export { projectTypesApi } from "./projectTypes";
export type {
  ProjectType,
  ProjectTypeListResponse,
  CreateProjectTypeRequest,
  UpdateProjectTypeRequest,
  ProjectTypeFilter,
  SkillRequirement,
  ValidationResult,
  ValidationError,
  SchemaInferenceResult,
  SchemaAmbiguity,
} from "./projectTypes";
export { queueApi } from "./queue";
export type {
  QueueItem,
  QueueListResponse,
  QueueStats,
  QueueFilters,
  QueueSort,
  RejectReason,
  AcceptResponse,
  ClaimRequest,
  UserPresence,
  PresenceResponse,
} from "./queue";
export { tasksApi } from "./tasks";
export type { TaskWithLayout } from "./tasks";
export { draftsApi } from "./drafts";
export type { Draft } from "./drafts";
export { skipReasonsApi } from "./skipReasons";
export type { SkipReason, TaskSkipResponse } from "./skipReasons";
export { annotationsApi } from "./annotations";
export type {
  Annotation,
  SubmitAnnotationRequest,
  NextTaskResponse,
} from "./annotations";
