/**
 * API module exports.
 * Re-exports all API clients and types for convenient importing.
 */

export { api, ApiError } from './client';
export { projectsApi } from './projects';
export type {
  Project,
  ProjectStatus,
  ProjectListResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilter,
  CloneProjectOptions,
} from './projects';
export { projectTypesApi } from './projectTypes';
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
} from './projectTypes';
