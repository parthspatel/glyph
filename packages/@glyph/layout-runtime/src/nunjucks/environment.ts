/**
 * Nunjucks Environment
 *
 * Configured Nunjucks environment with security constraints.
 * Includes autoescape, throwOnUndefined, and DoS protection.
 */

import nunjucks from 'nunjucks';
import type { SecurityConfig } from './security';
import { DEFAULT_SECURITY, createSecureContext } from './security';

export interface NunjucksEnvOptions {
  /** Security configuration overrides */
  security?: Partial<SecurityConfig>;
  /** Inline templates (name -> content) */
  templates?: Record<string, string>;
}

export interface NunjucksEnv {
  /** The underlying Nunjucks environment */
  env: nunjucks.Environment;
  /** Active security configuration */
  security: SecurityConfig;
  /** Render a named template */
  render: (name: string, context?: Record<string, unknown>) => string;
  /** Render a template string directly */
  renderString: (src: string, context?: Record<string, unknown>) => string;
}

/**
 * Create a configured Nunjucks environment with security constraints.
 */
export function createNunjucksEnv(options: NunjucksEnvOptions = {}): NunjucksEnv {
  const security: SecurityConfig = { ...DEFAULT_SECURITY, ...options.security };

  // Track iteration counts for DoS protection
  let iterationCount = 0;

  // Create loader for inline templates
  class InlineLoader extends nunjucks.Loader {
    private templates: Record<string, string>;

    constructor(templates: Record<string, string> = {}) {
      super();
      this.templates = templates;
    }

    getSource(name: string) {
      if (name in this.templates) {
        return {
          src: this.templates[name],
          path: name,
          noCache: false,
        };
      }
      throw new Error(`Template not found: ${name}`);
    }
  }

  // Create environment with secure defaults
  const env = new nunjucks.Environment(new InlineLoader(options.templates || {}), {
    autoescape: true, // Escape HTML by default
    throwOnUndefined: true, // Error on undefined variables
    trimBlocks: true, // Trim first newline after block
    lstripBlocks: true, // Strip leading whitespace from blocks
  });

  // Add iteration counter to prevent DoS
  env.addGlobal('__checkIteration', () => {
    iterationCount++;
    if (iterationCount > security.maxIterations) {
      throw new Error(`Maximum iterations (${security.maxIterations}) exceeded`);
    }
  });

  // Wrapped render functions that apply security
  const render = (name: string, context?: Record<string, unknown>): string => {
    iterationCount = 0;
    const secureContext = createSecureContext(context ?? {}, security);
    return env.render(name, secureContext);
  };

  const renderString = (src: string, context?: Record<string, unknown>): string => {
    iterationCount = 0;
    const secureContext = createSecureContext(context ?? {}, security);
    return env.renderString(src, secureContext);
  };

  return {
    env,
    security,
    render,
    renderString,
  };
}
