/**
 * WorkflowYamlEditor - Monaco-based YAML editor for workflow configuration.
 * Provides syntax highlighting, validation, and formatting.
 */
import { memo, useCallback, useRef, useState, useEffect } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Copy, Download, Wand2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseYamlConfig } from "../converters";

// =============================================================================
// Types
// =============================================================================

export interface WorkflowYamlEditorProps {
  /** Current YAML content */
  value: string;
  /** Called when content changes */
  onChange: (value: string) => void;
  /** Called when validation errors change */
  onValidationChange?: (errors: string[]) => void;
  /** Additional class names */
  className?: string;
  /** Read-only mode */
  readOnly?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export const WorkflowYamlEditor = memo(function WorkflowYamlEditor({
  value,
  onChange,
  onValidationChange,
  className,
  readOnly = false,
}: WorkflowYamlEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Validate YAML on change
  useEffect(() => {
    const { errors } = parseYamlConfig(value);
    setValidationErrors(errors);
    onValidationChange?.(errors);
  }, [value, onValidationChange]);

  // Handle editor mount
  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure YAML language defaults
    monaco.languages.yaml?.yamlDefaults?.setDiagnosticsOptions?.({
      enableSchemaRequest: false,
      validate: true,
    });

    // Focus editor
    editor.focus();
  }, []);

  // Handle content change
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange],
  );

  // Format YAML
  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument")?.run();
    }
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [value]);

  // Download as file
  const handleDownload = useCallback(() => {
    const blob = new Blob([value], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "workflow.yaml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [value]);

  const hasErrors = validationErrors.length > 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <div className="flex items-center gap-1.5 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{validationErrors.length} error(s)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Valid</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            disabled={readOnly}
            title="Format YAML"
          >
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            title="Download YAML"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error panel */}
      {hasErrors && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
          <ul className="text-sm text-destructive space-y-1">
            {validationErrors.slice(0, 5).map((error, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </li>
            ))}
            {validationErrors.length > 5 && (
              <li className="text-muted-foreground">
                ...and {validationErrors.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="yaml"
          value={value}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: true },
            lineNumbers: "on",
            wordWrap: "on",
            tabSize: 2,
            insertSpaces: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: "JetBrains Mono, Menlo, Monaco, monospace",
            padding: { top: 12 },
            renderValidationDecorations: "on",
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
        />
      </div>
    </div>
  );
});
