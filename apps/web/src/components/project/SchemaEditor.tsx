/**
 * JSON Schema editor using Monaco Editor.
 * Provides syntax highlighting, validation, and formatting.
 */

import Editor from '@monaco-editor/react';
import { useState, useCallback, useRef } from 'react';

interface SchemaEditorProps {
  value: object;
  onChange: (value: object) => void;
  height?: string;
  readOnly?: boolean;
}

export function SchemaEditor({
  value,
  onChange,
  height = '300px',
  readOnly = false
}: SchemaEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<unknown>(null);

  const handleEditorMount = (editor: unknown) => {
    editorRef.current = editor;
  };

  const handleChange = useCallback((newValue: string | undefined) => {
    if (!newValue || readOnly) return;

    try {
      const parsed = JSON.parse(newValue);
      setError(null);
      onChange(parsed);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [onChange, readOnly]);

  const formatDocument = () => {
    if (editorRef.current) {
      (editorRef.current as { getAction: (id: string) => { run: () => void } })
        .getAction('editor.action.formatDocument')
        ?.run();
    }
  };

  const stringValue = JSON.stringify(value, null, 2);

  return (
    <div className="schema-editor">
      <div className="schema-editor-toolbar">
        <button
          type="button"
          onClick={formatDocument}
          className="btn btn-xs btn-ghost"
          disabled={readOnly}
        >
          Format
        </button>
        {error && (
          <span className="schema-editor-status error">
            Invalid JSON
          </span>
        )}
        {!error && Object.keys(value).length > 0 && (
          <span className="schema-editor-status valid">
            Valid JSON Schema
          </span>
        )}
      </div>
      <Editor
        height={height}
        language="json"
        value={stringValue}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          formatOnPaste: true,
          formatOnType: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers: 'on',
          folding: true,
          bracketPairColorization: { enabled: true },
          readOnly,
          tabSize: 2,
          wordWrap: 'on',
        }}
        theme="vs-light"
      />
      {error && (
        <div className="schema-editor-error">
          <span className="error-icon">⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}
