/**
 * Preview Pane - Live rendered preview of Nunjucks template.
 *
 * Features:
 * - Real-time rendering on content change
 * - Error display when template is invalid
 * - Debounced updates for performance
 */
import { useState, useEffect, useMemo } from "react";
import { createNunjucksEnv } from "@glyph/layout-runtime";
import { AlertCircle, Info } from "lucide-react";

interface PreviewPaneProps {
  content: string;
  data: Record<string, unknown>;
  errors: Array<{ line: number; message: string }>;
  settings?: Record<string, unknown>;
}

export function PreviewPane({
  content,
  data,
  errors,
  settings,
}: PreviewPaneProps) {
  const [renderedHtml, setRenderedHtml] = useState("");
  const [renderError, setRenderError] = useState<string | null>(null);

  // Create Nunjucks environment once
  const nunjucksEnv = useMemo(() => {
    return createNunjucksEnv({
      security: {
        maxIterations: 1000,
        maxDepth: 10,
      },
    });
  }, []);

  // Render template when content or data changes (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        // Build context with standard binding roots
        const context = {
          input: data,
          output: {},
          context: {},
          config: settings || {},
          user: {
            id: "preview-user",
            name: "Preview User",
            role: "annotator",
          },
        };

        // Render template
        const html = nunjucksEnv.renderString(content, context);
        setRenderedHtml(html);
        setRenderError(null);
      } catch (err) {
        const error = err as Error;
        setRenderError(error.message);
        setRenderedHtml("");
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeout);
  }, [content, data, settings, nunjucksEnv]);

  // Show errors if any
  if (errors.length > 0 || renderError) {
    return (
      <div className="h-full p-4 overflow-auto">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="font-medium text-destructive">
              Template Errors
            </span>
          </div>

          {renderError && (
            <div className="mb-3 p-3 bg-background rounded border text-sm">
              <span className="font-medium">Render Error:</span>
              <pre className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                {renderError}
              </pre>
            </div>
          )}

          {errors.length > 0 && (
            <ul className="space-y-2">
              {errors.map((error, i) => (
                <li
                  key={i}
                  className="text-sm p-2 bg-background rounded border flex items-start gap-2"
                >
                  <span className="text-xs bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                    Line {error.line}
                  </span>
                  <span className="text-muted-foreground">{error.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // Show empty state if no content
  if (!content.trim()) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Enter a template to see preview</p>
          <p className="text-xs mt-1">
            Use {"{{ input.field }}"} to display data
          </p>
        </div>
      </div>
    );
  }

  // Render preview
  return (
    <div className="h-full overflow-auto">
      <div
        className="p-4 prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
}
