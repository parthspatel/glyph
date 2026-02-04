/**
 * SchemaEditor - Monaco-based JSON Schema editor.
 */
import { memo, useCallback, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Copy, Wand2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface SchemaEditorProps {
  /** Label for the editor */
  label: string;
  /** Current schema JSON string */
  value: string;
  /** Called when schema changes */
  onChange: (value: string) => void;
  /** Optional class names */
  className?: string;
  /** Editor height */
  height?: string | number;
}

// =============================================================================
// Default Schema Template
// =============================================================================

const DEFAULT_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier"
    },
    "text": {
      "type": "string",
      "description": "Text content to annotate"
    }
  },
  "required": ["id", "text"]
}`;

// =============================================================================
// Component
// =============================================================================

export const SchemaEditor = memo(function SchemaEditor({
  label,
  value,
  onChange,
  className,
  height = 250,
}: SchemaEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const handleFormat = useCallback(() => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
  }, [value]);

  const handleClear = useCallback(() => {
    onChange(DEFAULT_SCHEMA);
  }, [onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleFormat} title="Format">
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} title="Reset to default">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Editor
          height={height}
          defaultLanguage="json"
          value={value}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            wordWrap: "on",
            tabSize: 2,
            insertSpaces: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: "JetBrains Mono, Menlo, Monaco, monospace",
            padding: { top: 8 },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
});

export { DEFAULT_SCHEMA };
