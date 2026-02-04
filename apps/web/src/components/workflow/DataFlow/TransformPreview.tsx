/**
 * TransformPreview - Live preview of Nunjucks transformation with diff view.
 */
import { memo, useState, useEffect, useMemo } from "react";
import { ArrowRight, AlertCircle, Loader2, Eye, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface TransformPreviewProps {
  /** Nunjucks expression to evaluate */
  expression: string;
  /** Sample input data */
  sampleData: Record<string, unknown>;
  /** Additional class names */
  className?: string;
}

type ViewMode = "side-by-side" | "diff";

// =============================================================================
// Mock Nunjucks Renderer
// =============================================================================

function renderNunjucks(
  expression: string,
  context: Record<string, unknown>
): { result: unknown; error: string | null } {
  try {
    // Simple variable resolution for common patterns
    // In production, use actual nunjucks library
    const varMatch = expression.match(/\{\{\s*([^}|]+)\s*(\|[^}]*)?\}\}/);
    if (!varMatch) {
      return { result: expression, error: null };
    }

    const path = varMatch[1].trim();
    const filter = varMatch[2]?.trim();

    // Resolve path
    const parts = path.split(".");
    let value: unknown = context;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return { result: undefined, error: `Path not found: ${path}` };
      }
    }

    // Apply filter if present
    if (filter) {
      const filterName = filter.slice(1).trim().split("(")[0];
      switch (filterName) {
        case "lower":
          value = String(value).toLowerCase();
          break;
        case "upper":
          value = String(value).toUpperCase();
          break;
        case "json":
          value = JSON.stringify(value);
          break;
        case "length":
          value = Array.isArray(value) ? value.length : String(value).length;
          break;
        case "first":
          value = Array.isArray(value) ? value[0] : value;
          break;
        case "last":
          value = Array.isArray(value) ? value[value.length - 1] : value;
          break;
      }
    }

    return { result: value, error: null };
  } catch (e) {
    return {
      result: undefined,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// =============================================================================
// Diff Component
// =============================================================================

interface DiffViewProps {
  input: string;
  output: string;
}

const DiffView = memo(function DiffView({ input, output }: DiffViewProps) {
  // Simple line-by-line diff
  const inputLines = input.split("\n");
  const outputLines = output.split("\n");
  const maxLines = Math.max(inputLines.length, outputLines.length);

  return (
    <div className="font-mono text-sm">
      {Array.from({ length: maxLines }).map((_, i) => {
        const inputLine = inputLines[i] || "";
        const outputLine = outputLines[i] || "";
        const isDifferent = inputLine !== outputLine;

        return (
          <div key={i} className="flex">
            <div
              className={cn(
                "flex-1 px-2 py-0.5",
                isDifferent && inputLine && "bg-red-500/20 text-red-300"
              )}
            >
              {inputLine || " "}
            </div>
            <div
              className={cn(
                "flex-1 px-2 py-0.5",
                isDifferent && outputLine && "bg-green-500/20 text-green-300"
              )}
            >
              {outputLine || " "}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// =============================================================================
// Component
// =============================================================================

export const TransformPreview = memo(function TransformPreview({
  expression,
  sampleData,
  className,
}: TransformPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ result: unknown; error: string | null }>({
    result: undefined,
    error: null,
  });

  // Build context from sample data
  const context = useMemo(
    () => ({
      input: sampleData,
      steps: {
        annotate: {
          output: {
            annotations: [
              { label: "PERSON", value: "John Doe", confidence: 0.95 },
              { label: "ORG", value: "Acme Inc", confidence: 0.87 },
            ],
          },
        },
      },
      task: {
        id: "task_123",
        priority: 1,
        status: "in_progress",
      },
      user: {
        id: "user_456",
        name: "Jane Smith",
        role: "annotator",
      },
    }),
    [sampleData]
  );

  // Debounced evaluation
  useEffect(() => {
    if (!expression) {
      setResult({ result: undefined, error: null });
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      const res = renderNunjucks(expression, context);
      setResult(res);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [expression, context]);

  const inputJson = JSON.stringify(sampleData, null, 2);
  const outputJson =
    result.error || result.result === undefined
      ? ""
      : typeof result.result === "string"
        ? result.result
        : JSON.stringify(result.result, null, 2);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <span className="text-sm font-medium">Transform Preview</span>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "side-by-side" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("side-by-side")}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "diff" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("diff")}
          >
            <GitCompare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : result.error ? (
          <div className="p-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Transform Error</p>
                <p className="text-sm mt-1">{result.error}</p>
              </div>
            </div>
          </div>
        ) : viewMode === "diff" ? (
          <div className="p-2">
            <DiffView input={inputJson} output={outputJson} />
          </div>
        ) : (
          <div className="flex h-full">
            {/* Input */}
            <div className="flex-1 border-r">
              <div className="p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                INPUT
              </div>
              <pre className="p-3 text-xs font-mono overflow-auto">
                {inputJson}
              </pre>
            </div>

            {/* Arrow */}
            <div className="flex items-center px-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Output */}
            <div className="flex-1">
              <div className="p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                OUTPUT
              </div>
              <pre className="p-3 text-xs font-mono overflow-auto">
                {outputJson || <span className="text-muted-foreground italic">No output</span>}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Expression trace (collapsed by default) */}
      {expression && !result.error && (
        <div className="border-t">
          <details className="group">
            <summary className="px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted/50">
              Evaluation Trace
            </summary>
            <div className="px-3 py-2 bg-muted/30 text-xs font-mono">
              <p>Expression: <code className="text-primary">{expression}</code></p>
              <p className="mt-1">
                Result type: <code>{typeof result.result}</code>
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
});
