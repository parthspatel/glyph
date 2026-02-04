/**
 * DataPreview - Single row data preview with navigation.
 */
import { memo, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface DataPreviewProps {
  /** Total number of rows */
  totalRows: number;
  /** Function to fetch a row by index */
  fetchRow: (index: number) => Promise<Record<string, unknown>>;
  /** Input schema for validation (optional) */
  inputSchema?: string;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Mock Data Generator
// =============================================================================

function generateMockRow(index: number): Record<string, unknown> {
  return {
    id: `item_${index + 1}`,
    text: `This is sample text for item ${index + 1}. It contains some content that needs to be annotated.`,
    metadata: {
      source: index % 2 === 0 ? "dataset_a" : "dataset_b",
      timestamp: new Date(Date.now() - index * 86400000).toISOString(),
      priority: index % 3 === 0 ? "high" : "normal",
    },
  };
}

// =============================================================================
// Component
// =============================================================================

export const DataPreview = memo(function DataPreview({
  totalRows = 150,
  fetchRow,
  inputSchema,
  className,
}: DataPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rowData, setRowData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [jumpToValue, setJumpToValue] = useState("");

  // Load row data
  const loadRow = useCallback(
    async (index: number) => {
      if (index < 0 || index >= totalRows) return;

      setIsLoading(true);
      try {
        let data: Record<string, unknown>;
        if (fetchRow) {
          data = await fetchRow(index);
        } else {
          // Mock delay and data
          await new Promise((resolve) => setTimeout(resolve, 300));
          data = generateMockRow(index);
        }
        setRowData(data);
        setCurrentIndex(index);

        // Validate against schema if provided
        if (inputSchema) {
          try {
            const schema = JSON.parse(inputSchema);
            const errors: string[] = [];
            // Basic validation
            if (schema.required) {
              for (const field of schema.required) {
                if (!(field in data)) {
                  errors.push(`Missing required field: ${field}`);
                }
              }
            }
            setValidationErrors(errors);
          } catch {
            setValidationErrors(["Invalid schema"]);
          }
        } else {
          setValidationErrors([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [totalRows, fetchRow, inputSchema]
  );

  // Initialize first row
  useState(() => {
    loadRow(0);
  });

  // Navigation handlers
  const goToFirst = useCallback(() => loadRow(0), [loadRow]);
  const goToPrev = useCallback(
    () => loadRow(currentIndex - 1),
    [loadRow, currentIndex]
  );
  const goToNext = useCallback(
    () => loadRow(currentIndex + 1),
    [loadRow, currentIndex]
  );
  const goToLast = useCallback(
    () => loadRow(totalRows - 1),
    [loadRow, totalRows]
  );

  const handleJumpTo = useCallback(() => {
    const index = parseInt(jumpToValue, 10) - 1;
    if (!isNaN(index) && index >= 0 && index < totalRows) {
      loadRow(index);
      setJumpToValue("");
    }
  }, [jumpToValue, loadRow, totalRows]);

  const isValid = validationErrors.length === 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Data Preview</span>
          {isValid ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Check className="h-3 w-3 mr-1" />
              Valid
            </Badge>
          ) : (
            <Badge variant="outline" className="text-destructive border-destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              {validationErrors.length} error(s)
            </Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          Row {currentIndex + 1} of {totalRows}
        </span>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToFirst}
          disabled={currentIndex === 0 || isLoading}
          title="First row"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrev}
          disabled={currentIndex === 0 || isLoading}
          title="Previous row"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          disabled={currentIndex === totalRows - 1 || isLoading}
          title="Next row"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToLast}
          disabled={currentIndex === totalRows - 1 || isLoading}
          title="Last row"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 ml-2">
          <Input
            type="number"
            min={1}
            max={totalRows}
            value={jumpToValue}
            onChange={(e) => setJumpToValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJumpTo()}
            placeholder="Go to..."
            className="w-20 h-8 text-sm"
          />
          <Button variant="outline" size="sm" onClick={handleJumpTo}>
            Go
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rowData ? (
          <div className="space-y-4">
            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <h4 className="text-sm font-medium text-destructive mb-2">
                  Validation Errors
                </h4>
                <ul className="text-sm text-destructive space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* JSON view */}
            <pre className="p-4 rounded-lg bg-muted/50 overflow-auto text-sm font-mono">
              {JSON.stringify(rowData, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No data loaded
          </div>
        )}
      </div>
    </div>
  );
});
