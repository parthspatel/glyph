/**
 * Nunjucks Security Configuration
 *
 * Nunjucks has NO built-in sandboxing, so security must be enforced
 * at the environment level with expression allowlists and iteration limits.
 */

export interface SecurityConfig {
  /** Whitelist of allowed component names */
  allowedComponents: string[];
  /** Regex pattern for allowed variable binding paths */
  bindingPathPattern: RegExp;
  /** Root variables allowed in expressions */
  expressionAllowlist: string[];
  /** Max template include depth (DoS protection) */
  maxDepth: number;
  /** Max loop iterations (DoS protection) */
  maxIterations: number;
}

export const DEFAULT_SECURITY: SecurityConfig = {
  allowedComponents: [], // Must be explicitly set
  bindingPathPattern: /^(input|output|context|config|user)\.[a-zA-Z0-9_.[\]]+$/,
  expressionAllowlist: ['input', 'output', 'context', 'config', 'user', 'loop'],
  maxDepth: 10,
  maxIterations: 1000,
};

/**
 * Validate that a binding expression is safe.
 * Checks against the allowed pattern and root variable allowlist.
 */
export function validateExpression(
  expr: string,
  config: SecurityConfig = DEFAULT_SECURITY
): boolean {
  // Check against allowlist pattern
  if (!config.bindingPathPattern.test(expr)) {
    console.warn(`Expression "${expr}" does not match allowed pattern`);
    return false;
  }

  // Check root variable is allowed
  const root = expr.split('.')[0].split('[')[0];
  if (!config.expressionAllowlist.includes(root)) {
    console.warn(`Expression root "${root}" not in allowlist`);
    return false;
  }

  return true;
}

/**
 * Validate that a component name is allowed.
 * Empty allowlist means all registered components are allowed.
 */
export function validateComponent(name: string, config: SecurityConfig): boolean {
  if (config.allowedComponents.length === 0) {
    return true;
  }
  return config.allowedComponents.includes(name);
}

/**
 * Create a secure data context with only allowed variables.
 * Filters out any variables not in the expression allowlist.
 */
export function createSecureContext(
  data: Record<string, unknown>,
  config: SecurityConfig = DEFAULT_SECURITY
): Record<string, unknown> {
  const secure: Record<string, unknown> = {};
  for (const key of config.expressionAllowlist) {
    if (key in data) {
      secure[key] = data[key];
    }
  }
  return secure;
}
