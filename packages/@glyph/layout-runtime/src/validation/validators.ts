/**
 * Pre-compiled validators for layout and annotation schemas.
 *
 * These validators are compiled once at module load time for optimal
 * performance (10x faster than per-validation compilation).
 */

import { compileSchema, getValidationErrors, type ValidationError } from './ajv';
import layoutSchema from './schemas/layout.schema.json';

// ============================================================================
// Layout Types
// ============================================================================

export interface Layout {
  version: string;
  template: 'nunjucks' | 'mdx' | 'tsx';
  content?: string;
  inputSchema?: object;
  outputSchema?: object;
  settings?: LayoutSettings;
  shortcuts?: Record<string, string>;
  components?: string[];
  metadata?: LayoutMetadata;
}

export interface LayoutSettings {
  autoSave?: boolean;
  autoSaveInterval?: number;
  showProgress?: boolean;
  keyboardShortcuts?: boolean;
  confirmSubmit?: boolean;
  allowSkip?: boolean;
  customCss?: string;
  maxNestingDepth?: number;
  maxIterations?: number;
}

export interface LayoutMetadata {
  name?: string;
  description?: string;
  author?: string;
  tags?: string[];
}

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  errors: ValidationError[];
}

// ============================================================================
// Pre-compiled Validators
// ============================================================================

/**
 * Validate layout configuration.
 * Pre-compiled at module load time.
 */
export const validateLayout = compileSchema<Layout>('layout', layoutSchema);

/**
 * Validate layout and return detailed result with errors.
 */
export function validateLayoutWithErrors(data: unknown): ValidationResult<Layout> {
  const valid = validateLayout(data);
  return {
    valid,
    data: valid ? (data as Layout) : undefined,
    errors: valid ? [] : getValidationErrors('layout'),
  };
}

// ============================================================================
// Dynamic Schema Validators
// ============================================================================

/**
 * Create and cache a validator for a project-specific output schema.
 * Called once per project, not per validation.
 *
 * @param projectId - Unique project identifier
 * @param outputSchema - JSON Schema for annotation output
 * @returns Validator function
 */
export function createOutputValidator<T = unknown>(
  projectId: string,
  outputSchema: object
): (data: unknown) => data is T {
  const schemaId = `output:${projectId}`;
  return compileSchema<T>(schemaId, outputSchema);
}

/**
 * Create and cache a validator for a project-specific input schema.
 * Called once per project, not per validation.
 *
 * @param projectId - Unique project identifier
 * @param inputSchema - JSON Schema for task input
 * @returns Validator function
 */
export function createInputValidator<T = unknown>(
  projectId: string,
  inputSchema: object
): (data: unknown) => data is T {
  const schemaId = `input:${projectId}`;
  return compileSchema<T>(schemaId, inputSchema);
}

/**
 * Validate data with a dynamic schema and return detailed result.
 * Compiles and caches the schema on first use.
 *
 * @param schemaId - Unique identifier for the schema
 * @param schema - JSON Schema object
 * @param data - Data to validate
 * @returns Validation result with errors
 */
export function validateWithSchema<T = unknown>(
  schemaId: string,
  schema: object,
  data: unknown
): ValidationResult<T> {
  const validator = compileSchema<T>(schemaId, schema);
  const valid = validator(data);
  return {
    valid,
    data: valid ? (data as T) : undefined,
    errors: valid ? [] : getValidationErrors(schemaId),
  };
}

// ============================================================================
// Schema Defaults
// ============================================================================

/**
 * Default layout settings.
 * Applied when settings are missing from layout configuration.
 */
export const DEFAULT_LAYOUT_SETTINGS: Required<LayoutSettings> = {
  autoSave: true,
  autoSaveInterval: 5000,
  showProgress: true,
  keyboardShortcuts: true,
  confirmSubmit: true,
  allowSkip: true,
  customCss: '',
  maxNestingDepth: 10,
  maxIterations: 1000,
};

/**
 * Apply default settings to a layout configuration.
 */
export function applyLayoutDefaults(layout: Layout): Layout {
  return {
    ...layout,
    settings: {
      ...DEFAULT_LAYOUT_SETTINGS,
      ...layout.settings,
    },
  };
}
