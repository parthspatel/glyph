/**
 * Ajv configuration with compile-once pattern for optimal performance.
 *
 * CRITICAL: Schemas are compiled once and cached. Never call ajv.validate()
 * directly in hot paths - use the cached validators from compileSchema().
 */

import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

// Singleton Ajv instance with optimal settings
const ajv = new Ajv({
  allErrors: true,          // Collect all errors, not just first
  coerceTypes: false,       // Strict typing - no automatic coercion
  useDefaults: true,        // Apply schema defaults
  removeAdditional: false,  // Don't silently remove extra properties
  strict: true,             // Enable strict mode for schema validation
  validateFormats: true,    // Validate format keywords
});

// Add standard formats (email, uri, date-time, uuid, etc.)
addFormats(ajv);

// Cache of compiled validators
const validatorCache = new Map<string, ValidateFunction>();

export interface ValidationError {
  path: string;
  message: string;
  keyword?: string;
  params?: Record<string, unknown>;
}

/**
 * Compile a JSON Schema once and cache the validator.
 *
 * @param schemaId - Unique identifier for the schema
 * @param schema - JSON Schema object
 * @returns Type-guarded validator function
 *
 * @example
 * const validateUser = compileSchema<User>('user', userSchema);
 * if (validateUser(data)) {
 *   // data is typed as User
 * }
 */
export function compileSchema<T>(
  schemaId: string,
  schema: object
): (data: unknown) => data is T {
  if (!validatorCache.has(schemaId)) {
    try {
      const validate = ajv.compile(schema);
      validatorCache.set(schemaId, validate);
    } catch (error) {
      throw new Error(
        `Failed to compile schema "${schemaId}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const validator = validatorCache.get(schemaId)!;
  return (data: unknown): data is T => validator(data) as boolean;
}

/**
 * Get validation errors from the last validation of a schema.
 *
 * @param schemaId - The schema identifier
 * @returns Array of validation errors with paths and messages
 */
export function getValidationErrors(schemaId: string): ValidationError[] {
  const validator = validatorCache.get(schemaId);
  if (!validator?.errors) return [];

  return validator.errors.map((error: ErrorObject) => ({
    path: error.instancePath || '/',
    message: error.message || 'Unknown validation error',
    keyword: error.keyword,
    params: error.params as Record<string, unknown>,
  }));
}

/**
 * Check if a schema has been compiled and cached.
 */
export function hasCompiledSchema(schemaId: string): boolean {
  return validatorCache.has(schemaId);
}

/**
 * Remove a compiled schema from cache.
 * Useful for dynamic schemas that need to be recompiled.
 */
export function removeCompiledSchema(schemaId: string): boolean {
  return validatorCache.delete(schemaId);
}

/**
 * Clear all compiled schemas from cache.
 * Primarily for testing.
 */
export function clearSchemaCache(): void {
  validatorCache.clear();
}

/**
 * Get the number of compiled schemas in cache.
 */
export function getSchemaCount(): number {
  return validatorCache.size;
}

export { ajv };
