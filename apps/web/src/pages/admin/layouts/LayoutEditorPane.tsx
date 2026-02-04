/**
 * Layout Editor Pane - Monaco editor with Nunjucks language support.
 *
 * Features:
 * - Nunjucks syntax highlighting
 * - Autocomplete for bindings (input., output., etc.)
 * - Component name completion
 * - Inline error markers
 */
import { useRef, useEffect, useCallback } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import type { editor as MonacoEditor, IDisposable, Uri } from "monaco-editor";
import {
  initializeNunjucksMonaco,
  type NunjucksMonacoConfig,
} from "@glyph/layout-runtime";

// Lazy-load component interfaces to avoid circular deps
const getComponentInterfaces = async () => {
  try {
    const mod = await import("@glyph/components/interfaces");
    // Return all exported interfaces as a record
    return mod as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
};

interface LayoutEditorPaneProps {
  content: string;
  onChange: (content: string) => void;
  onValidation: (errors: Array<{ line: number; message: string }>) => void;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  allowedComponents?: string[];
  readOnly?: boolean;
}

export function LayoutEditorPane({
  content,
  onChange,
  onValidation,
  inputSchema,
  outputSchema,
  allowedComponents,
  readOnly = false,
}: LayoutEditorPaneProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const disposablesRef = useRef<IDisposable[]>([]);
  const initializedRef = useRef(false);

  // Initialize Monaco when mounted
  const handleEditorMount: OnMount = useCallback(
    async (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Only initialize once
      if (initializedRef.current) return;
      initializedRef.current = true;

      // Load component interfaces
      const componentInterfaces = await getComponentInterfaces();

      // Initialize Nunjucks language support
      const config: NunjucksMonacoConfig = {
        inputSchema,
        outputSchema,
        componentInterfaces: componentInterfaces as Record<string, any>,
        allowedComponents,
      };

      const { setupDiagnostics, dispose } = initializeNunjucksMonaco(
        monaco,
        config,
      );
      disposablesRef.current.push({ dispose });

      // Set up diagnostics for this editor
      const diagnosticDisposable = setupDiagnostics(editor);
      disposablesRef.current.push(diagnosticDisposable);

      // Listen for marker changes to report validation errors
      const markerDisposable = monaco.editor.onDidChangeMarkers(
        (uris: readonly Uri[]) => {
          const model = editor.getModel();
          if (model && uris[0]?.toString() === model.uri.toString()) {
            const markers = monaco.editor.getModelMarkers({
              resource: uris[0],
            });
            onValidation(
              markers.map((m: MonacoEditor.IMarkerData) => ({
                line: m.startLineNumber,
                message: m.message,
              })),
            );
          }
        },
      );
      disposablesRef.current.push(markerDisposable);

      // Focus editor
      editor.focus();
    },
    [inputSchema, outputSchema, allowedComponents, onValidation],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((d) => d.dispose?.());
      disposablesRef.current = [];
    };
  }, []);

  // Handle content changes
  const handleChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) {
        onChange(value);
      }
    },
    [onChange],
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
        <span className="text-sm font-medium">Template Editor</span>
        <span className="text-xs text-muted-foreground">Nunjucks</span>
      </div>

      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="nunjucks"
          value={content}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            renderLineHighlight: "line",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            folding: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
          theme="vs-dark"
        />
      </div>
    </div>
  );
}
