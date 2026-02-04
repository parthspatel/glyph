/**
 * NunjucksEditor - Monaco editor with Nunjucks syntax and autocomplete.
 */
import { memo, useCallback, useRef, useEffect } from "react";
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react";
import type { editor, languages } from "monaco-editor";
import { cn } from "@/lib/utils";
import {
  useDataFlowContext,
  type AutocompleteSuggestion,
} from "../hooks/useDataFlowContext";

// =============================================================================
// Types
// =============================================================================

export interface NunjucksEditorProps {
  /** Current value */
  value: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Step ID for context */
  stepId?: string;
  /** Editor height */
  height?: string | number;
  /** Additional class names */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

// =============================================================================
// Monaco Configuration
// =============================================================================

const NUNJUCKS_LANGUAGE_ID = "nunjucks";

function registerNunjucksLanguage(monaco: Monaco) {
  // Check if already registered
  if (
    monaco.languages
      .getLanguages()
      .some((l: { id: string }) => l.id === NUNJUCKS_LANGUAGE_ID)
  ) {
    return;
  }

  // Register language
  monaco.languages.register({ id: NUNJUCKS_LANGUAGE_ID });

  // Define tokens
  monaco.languages.setMonarchTokensProvider(NUNJUCKS_LANGUAGE_ID, {
    tokenizer: {
      root: [
        // Variable expressions {{ ... }}
        [/\{\{/, { token: "delimiter.bracket", next: "@expression" }],
        // Block statements {% ... %}
        [/\{%/, { token: "delimiter.bracket", next: "@statement" }],
        // Comments {# ... #}
        [/\{#/, { token: "comment", next: "@comment" }],
        // Plain text
        [/[^{]+/, "string"],
      ],
      expression: [
        [/}}/, { token: "delimiter.bracket", next: "@root" }],
        [/\|/, "delimiter"],
        [/[a-zA-Z_]\w*/, "variable"],
        [/\./, "delimiter"],
        [/"[^"]*"/, "string"],
        [/'[^']*'/, "string"],
        [/\d+/, "number"],
        [/\s+/, "white"],
      ],
      statement: [
        [/%}/, { token: "delimiter.bracket", next: "@root" }],
        [
          /\b(if|else|elif|endif|for|endfor|block|endblock|extends|include|macro|endmacro|set|raw|endraw)\b/,
          "keyword",
        ],
        [/[a-zA-Z_]\w*/, "variable"],
        [/\s+/, "white"],
      ],
      comment: [
        [/#}/, { token: "comment", next: "@root" }],
        [/./, "comment"],
      ],
    },
  });

  // Define theme colors
  monaco.editor.defineTheme("nunjucks-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "delimiter.bracket", foreground: "f8c555" },
      { token: "variable", foreground: "9cdcfe" },
      { token: "keyword", foreground: "c586c0" },
      { token: "string", foreground: "ce9178" },
      { token: "comment", foreground: "6a9955" },
    ],
    colors: {},
  });
}

function createCompletionProvider(
  suggestions: AutocompleteSuggestion[],
): languages.CompletionItemProvider {
  return {
    triggerCharacters: [".", "{"],
    provideCompletionItems: (model, position) => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Check if we're inside {{ }}
      const inExpression = /\{\{[^}]*$/.test(textUntilPosition);
      if (!inExpression) {
        return { suggestions: [] };
      }

      // Get the current path being typed
      const match = textUntilPosition.match(/\{\{\s*([^}|]*)$/);
      const currentPath = match ? match[1].trim() : "";

      // Filter suggestions based on current path
      const filtered = suggestions.filter((s) => {
        if (s.kind === "filter") {
          // Show filters after |
          return /\|\s*$/.test(textUntilPosition);
        }
        if (!currentPath) {
          return s.kind === "variable";
        }
        return s.insertText.startsWith(currentPath);
      });

      const completionItems: languages.CompletionItem[] = filtered.map((s) => ({
        label: s.label,
        kind:
          s.kind === "variable"
            ? 5 // Variable
            : s.kind === "filter"
              ? 1 // Function
              : 9, // Property
        insertText:
          s.kind === "filter"
            ? s.insertText
            : s.insertText.slice(
                currentPath.length ? currentPath.lastIndexOf(".") + 1 : 0,
              ),
        detail: s.detail,
        range: {
          startLineNumber: position.lineNumber,
          startColumn:
            position.column - (currentPath.split(".").pop()?.length || 0),
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
      }));

      return { suggestions: completionItems };
    },
  };
}

// =============================================================================
// Component
// =============================================================================

export const NunjucksEditor = memo(function NunjucksEditor({
  value,
  onChange,
  stepId,
  height = 100,
  className,
  placeholder = "{{ input.text }}",
}: NunjucksEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { suggestions, validateExpression } = useDataFlowContext(stepId);

  // Handle editor mount
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Register language
      registerNunjucksLanguage(monaco);

      // Register completion provider
      const provider = createCompletionProvider(suggestions);
      monaco.languages.registerCompletionItemProvider(
        NUNJUCKS_LANGUAGE_ID,
        provider,
      );

      // Set placeholder
      if (!value && placeholder) {
        editor.setValue("");
      }
    },
    [suggestions, value, placeholder],
  );

  // Validate and mark errors
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const errors = validateExpression(value);
    const model = editorRef.current.getModel();
    if (!model) return;

    const markers: editor.IMarkerData[] = errors.map((error) => ({
      severity: monacoRef.current!.MarkerSeverity.Error,
      message: error,
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: model.getLineLength(1) + 1,
    }));

    monacoRef.current.editor.setModelMarkers(model, "nunjucks", markers);
  }, [value, validateExpression]);

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange],
  );

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <Editor
        height={height}
        language={NUNJUCKS_LANGUAGE_ID}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="nunjucks-dark"
        options={{
          minimap: { enabled: false },
          lineNumbers: "off",
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          wordWrap: "on",
          tabSize: 2,
          insertSpaces: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontSize: 13,
          fontFamily: "JetBrains Mono, Menlo, Monaco, monospace",
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            vertical: "hidden",
            horizontal: "hidden",
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          renderLineHighlight: "none",
        }}
      />
    </div>
  );
});
