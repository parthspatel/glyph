/**
 * Monaco diagnostic provider for Nunjucks templates.
 *
 * Validates templates and provides inline error markers for:
 * - Syntax errors from Nunjucks parser
 * - Security violations (disallowed bindings)
 * - Component allowlist violations
 * - Missing required props
 */
import type * as Monaco from "monaco-editor";
import nunjucks from "nunjucks";
import { validateExpression } from "../nunjucks/security";
import type { ComponentInterface } from "@glyph/components/interfaces";

/**
 * Context for template validation.
 */
export interface DiagnosticContext {
  /** Allowed component names (allowlist) */
  allowedComponents?: string[];
  /** Component interfaces for prop validation */
  componentInterfaces?: Record<string, ComponentInterface>;
}

/**
 * Validate a Nunjucks template and return Monaco markers.
 */
export function validateTemplate(
  monaco: typeof Monaco,
  content: string,
  context: DiagnosticContext = {},
): Monaco.editor.IMarkerData[] {
  const markers: Monaco.editor.IMarkerData[] = [];

  // 1. Check Nunjucks syntax
  try {
    nunjucks.compile(content);
  } catch (error: unknown) {
    const err = error as Error & { lineno?: number; colno?: number };
    const line = err.lineno || 1;
    const col = err.colno || 1;

    markers.push({
      severity: monaco.MarkerSeverity.Error,
      message: err.message || "Template syntax error",
      startLineNumber: line,
      startColumn: col,
      endLineNumber: line,
      endColumn: col + 10,
    });
  }

  // 2. Validate expressions and components line by line
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    const lineNum = i + 1;

    // Check expression bindings {{ ... }}
    const expressions = [...line.matchAll(/\{\{-?\s*([^}]+?)\s*-?\}\}/g)];
    for (const match of expressions) {
      const expr = match[1].trim().split("|")[0].trim();
      if (!validateExpression(expr)) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          message: `Expression "${expr}" uses disallowed binding path`,
          startLineNumber: lineNum,
          startColumn: (match.index || 0) + 1,
          endLineNumber: lineNum,
          endColumn: (match.index || 0) + match[0].length + 1,
        });
      }
    }

    // Check component names {% component "Name" ... %}
    const componentMatches = [
      ...line.matchAll(/\{%-?\s*component\s+"(\w+)"([^%]*)/g),
    ];
    for (const match of componentMatches) {
      const componentName = match[1];
      const propsString = match[2];

      // Check allowlist
      if (
        context.allowedComponents &&
        !context.allowedComponents.includes(componentName)
      ) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Component "${componentName}" is not in the allowlist`,
          startLineNumber: lineNum,
          startColumn: (match.index || 0) + 1,
          endLineNumber: lineNum,
          endColumn: (match.index || 0) + match[0].length + 1,
        });
      }

      // Check required props
      const iface = context.componentInterfaces?.[componentName];
      if (iface) {
        const providedProps = new Set(
          [...propsString.matchAll(/(\w+)\s*=/g)].map((m) => m[1]),
        );
        const requiredProps = Object.entries(iface.props)
          .filter(([, def]) => def.required)
          .map(([name]) => name);

        for (const required of requiredProps) {
          if (!providedProps.has(required)) {
            markers.push({
              severity: monaco.MarkerSeverity.Warning,
              message: `Missing required prop "${required}" for component "${componentName}"`,
              startLineNumber: lineNum,
              startColumn: (match.index || 0) + 1,
              endLineNumber: lineNum,
              endColumn: (match.index || 0) + match[0].length + 1,
            });
          }
        }
      }
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      { pattern: /__proto__/, message: "Prototype pollution attempt" },
      { pattern: /constructor\s*\[/, message: "Constructor access attempt" },
      { pattern: /\beval\b/, message: "eval() is not allowed" },
      {
        pattern: /\bFunction\b\s*\(/,
        message: "Function constructor is not allowed",
      },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      const dangerMatch = line.match(pattern);
      if (dangerMatch) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message,
          startLineNumber: lineNum,
          startColumn: (dangerMatch.index || 0) + 1,
          endLineNumber: lineNum,
          endColumn: (dangerMatch.index || 0) + dangerMatch[0].length + 1,
        });
      }
    }
  });

  // 3. Check for unclosed tags
  const blockTags = [
    { open: "if", close: "endif" },
    { open: "for", close: "endfor" },
    { open: "block", close: "endblock" },
    { open: "macro", close: "endmacro" },
    { open: "call", close: "endcall" },
    { open: "filter", close: "endfilter" },
    { open: "set", close: "endset" }, // Block set
    { open: "raw", close: "endraw" },
    { open: "component", close: "endcomponent" },
  ];

  for (const { open, close } of blockTags) {
    const openPattern = new RegExp(`\\{%-?\\s*${open}\\b`, "g");
    const closePattern = new RegExp(`\\{%-?\\s*${close}\\b`, "g");

    const openMatches = [...content.matchAll(openPattern)];
    const closeMatches = [...content.matchAll(closePattern)];

    if (openMatches.length > closeMatches.length) {
      // Find the last unclosed tag
      const lastOpen = openMatches[closeMatches.length];
      if (lastOpen) {
        const line = content.substring(0, lastOpen.index).split("\n").length;
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Unclosed {% ${open} %} tag - missing {% ${close} %}`,
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: 100,
        });
      }
    } else if (closeMatches.length > openMatches.length) {
      // Find the extra close tag
      const extraClose = closeMatches[openMatches.length];
      if (extraClose) {
        const line = content.substring(0, extraClose.index).split("\n").length;
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Unexpected {% ${close} %} tag without matching {% ${open} %}`,
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: 100,
        });
      }
    }
  }

  return markers;
}

/**
 * Set up live diagnostic validation for a Monaco editor.
 *
 * Returns a disposable that removes the validation when called.
 */
export function setupDiagnostics(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor,
  context: DiagnosticContext = {},
): Monaco.IDisposable {
  const model = editor.getModel();
  if (!model) {
    return { dispose: () => {} };
  }

  let timeout: ReturnType<typeof setTimeout> | null = null;

  const validate = () => {
    const content = model.getValue();
    const markers = validateTemplate(monaco, content, context);
    monaco.editor.setModelMarkers(model, "nunjucks", markers);
  };

  // Debounced validation on content change
  const disposable = model.onDidChangeContent(() => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(validate, 500);
  });

  // Initial validation
  validate();

  return {
    dispose: () => {
      disposable.dispose();
      if (timeout) clearTimeout(timeout);
      monaco.editor.setModelMarkers(model, "nunjucks", []);
    },
  };
}
