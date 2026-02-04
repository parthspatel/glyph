/**
 * Validation module exports.
 *
 * Provides:
 * - Ajv-based JSON Schema validation (compile-once pattern)
 * - Pre-compiled layout schema validator
 * - Dynamic schema validators for project-specific input/output
 * - Template string validation (security checks)
 */

// Ajv core
export {
  ajv,
  compileSchema,
  getValidationErrors,
  hasCompiledSchema,
  removeCompiledSchema,
  clearSchemaCache,
  getSchemaCount,
  type ValidationError,
} from "./ajv";

// Pre-compiled validators
export {
  validateLayout,
  validateLayoutWithErrors,
  createOutputValidator,
  createInputValidator,
  validateWithSchema,
  applyLayoutDefaults,
  DEFAULT_LAYOUT_SETTINGS,
  type Layout,
  type LayoutSettings,
  type LayoutMetadata,
  type ValidationResult,
} from "./validators";

// Template string validation (security checks)
export {
  validateLayout as validateLayoutTemplate,
  type ValidationResult as TemplateValidationResult,
  type ValidationError as TemplateValidationError,
} from "./template";
