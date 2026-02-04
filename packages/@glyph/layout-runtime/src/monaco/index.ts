/**
 * Monaco Editor extensions for Nunjucks templates.
 *
 * Provides:
 * - Syntax highlighting with Monarch tokenizer
 * - Autocomplete for bindings, components, and filters
 * - Hover documentation for keywords and components
 * - Inline diagnostics for syntax and validation errors
 *
 * @example
 * ```typescript
 * import * as monaco from 'monaco-editor';
 * import { initializeNunjucksMonaco } from '@glyph/layout-runtime/monaco';
 *
 * const { setupDiagnostics } = initializeNunjucksMonaco(monaco, {
 *   inputSchema: taskSchema,
 *   componentInterfaces: registeredComponents,
 *   allowedComponents: ['TextInput', 'Checkbox', 'NERTagger'],
 * });
 *
 * const editor = monaco.editor.create(container, {
 *   language: 'nunjucks',
 * });
 *
 * setupDiagnostics(editor);
 * ```
 */
import type * as Monaco from "monaco-editor";
import type { ComponentInterface } from "@glyph/components/interfaces";

import { registerNunjucksLanguage } from "./nunjucks-language";
import { registerCompletionProvider } from "./completion-provider";
import { registerHoverProvider } from "./hover-provider";
import { setupDiagnostics as setupEditorDiagnostics } from "./diagnostic-provider";

export {
  registerNunjucksLanguage,
  nunjucksLanguageConfig,
  nunjucksTokenProvider,
} from "./nunjucks-language";
export {
  NunjucksCompletionProvider,
  registerCompletionProvider,
  type CompletionContext,
} from "./completion-provider";
export {
  NunjucksHoverProvider,
  registerHoverProvider,
  type HoverContext,
} from "./hover-provider";
export {
  validateTemplate,
  setupDiagnostics,
  type DiagnosticContext,
} from "./diagnostic-provider";

/**
 * Configuration for initializing Monaco Nunjucks support.
 */
export interface NunjucksMonacoConfig {
  /** JSON Schema for input data (enables autocomplete) */
  inputSchema?: Record<string, unknown>;
  /** JSON Schema for output data (enables autocomplete) */
  outputSchema?: Record<string, unknown>;
  /** JSON Schema for context data (enables autocomplete) */
  contextSchema?: Record<string, unknown>;
  /** Component interfaces for autocomplete and validation */
  componentInterfaces: Record<string, ComponentInterface>;
  /** Allowed component names for validation */
  allowedComponents?: string[];
}

/**
 * Initialize all Monaco extensions for Nunjucks templates.
 *
 * This registers:
 * - Language definition with syntax highlighting
 * - Completion provider for autocomplete
 * - Hover provider for documentation
 *
 * Returns a function to set up diagnostics on individual editors.
 *
 * @param monaco - Monaco editor module
 * @param config - Configuration for language features
 * @returns Object with setupDiagnostics function
 */
export function initializeNunjucksMonaco(
  monaco: typeof Monaco,
  config: NunjucksMonacoConfig,
): {
  /** Set up live diagnostics on an editor instance */
  setupDiagnostics: (
    editor: Monaco.editor.IStandaloneCodeEditor,
  ) => Monaco.IDisposable;
  /** Disposable to clean up all registered providers */
  dispose: () => void;
} {
  // Register language
  registerNunjucksLanguage(monaco);

  // Register providers
  const completionDisposable = registerCompletionProvider(monaco, {
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    contextSchema: config.contextSchema,
    componentInterfaces: config.componentInterfaces,
  });

  const hoverDisposable = registerHoverProvider(monaco, {
    componentInterfaces: config.componentInterfaces,
  });

  return {
    setupDiagnostics: (editor: Monaco.editor.IStandaloneCodeEditor) =>
      setupEditorDiagnostics(monaco, editor, {
        allowedComponents: config.allowedComponents,
        componentInterfaces: config.componentInterfaces,
      }),
    dispose: () => {
      completionDisposable.dispose();
      hoverDisposable.dispose();
    },
  };
}
