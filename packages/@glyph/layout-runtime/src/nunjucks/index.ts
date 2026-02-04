/**
 * Nunjucks Module
 *
 * Provides a configured Nunjucks environment with security constraints
 * for rendering layout templates.
 */

export { createNunjucksEnv, type NunjucksEnv, type NunjucksEnvOptions } from './environment';
export {
  DEFAULT_SECURITY,
  validateExpression,
  validateComponent,
  createSecureContext,
  type SecurityConfig,
} from './security';
export { ComponentExtension, addComponentExtension } from './extensions';
export { addFilters } from './filters';
