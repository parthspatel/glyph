/**
 * Layout validation utilities
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Validate a layout template
 */
export function validateLayout(template: string): ValidationResult {
  const errors: ValidationError[] = [];

  // Check max nesting depth
  const maxDepth = 20;
  const depthMatches = template.match(/\{%\s*(for|if)/g);
  if (depthMatches && depthMatches.length > maxDepth) {
    errors.push({
      path: 'template',
      message: `Template exceeds maximum nesting depth of ${maxDepth}`,
      code: 'MAX_DEPTH_EXCEEDED',
    });
  }

  // Check for forbidden patterns (arbitrary JS execution)
  const forbiddenPatterns = [
    /\{\{.*eval\s*\(/,
    /\{\{.*Function\s*\(/,
    /\{\{.*constructor/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(template)) {
      errors.push({
        path: 'template',
        message: 'Template contains forbidden JavaScript execution',
        code: 'FORBIDDEN_EXECUTION',
      });
      break;
    }
  }

  // Check binding paths start with allowed prefixes
  const bindingRegex = /\$\.([\w.]+)/g;
  const allowedPrefixes = ['input', 'output', 'context', 'config', 'user', 'task', 'ui'];
  let match;
  while ((match = bindingRegex.exec(template)) !== null) {
    const path = match[1];
    const prefix = path.split('.')[0];
    if (!allowedPrefixes.includes(prefix)) {
      errors.push({
        path: `$.${path}`,
        message: `Invalid binding path prefix: ${prefix}. Must be one of: ${allowedPrefixes.join(', ')}`,
        code: 'INVALID_BINDING_PREFIX',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
