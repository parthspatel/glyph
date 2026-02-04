/**
 * TestResultsPanel - Display test execution results.
 * Shows before/after JSON with diff highlighting and execution timeline.
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  XCircle,
  SkipForward,
  Clock,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { StepResult, TestState } from "../hooks/useWorkflowTest";

// =============================================================================
// Types
// =============================================================================

interface TestResultsPanelProps {
  testState: TestState;
  onStepClick?: (stepId: string) => void;
}

// =============================================================================
// Diff Computation (Simple line-based diff)
// =============================================================================

interface DiffLine {
  type: "unchanged" | "added" | "removed";
  content: string;
}

function computeSimpleDiff(before: string, after: string): DiffLine[] {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const result: DiffLine[] = [];

  const maxLen = Math.max(beforeLines.length, afterLines.length);

  for (let i = 0; i < maxLen; i++) {
    const beforeLine = beforeLines[i];
    const afterLine = afterLines[i];

    if (beforeLine === undefined && afterLine !== undefined) {
      result.push({ type: "added", content: afterLine });
    } else if (afterLine === undefined && beforeLine !== undefined) {
      result.push({ type: "removed", content: beforeLine });
    } else if (beforeLine !== afterLine) {
      result.push({ type: "removed", content: beforeLine || "" });
      result.push({ type: "added", content: afterLine || "" });
    } else {
      result.push({ type: "unchanged", content: beforeLine || "" });
    }
  }

  return result;
}

// =============================================================================
// Step Result Item
// =============================================================================

interface StepResultItemProps {
  result: StepResult;
  isSelected: boolean;
  onSelect: () => void;
}

function StepResultItem({ result, isSelected, onSelect }: StepResultItemProps) {
  const duration = result.completedAt
    ? result.completedAt.getTime() - result.startedAt.getTime()
    : 0;

  return (
    <button
      className={`w-full p-3 text-left rounded-md border transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:bg-muted/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        {result.skipped ? (
          <SkipForward className="h-4 w-4 text-muted-foreground" />
        ) : result.error ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        <span className="font-medium">{result.stepName}</span>
        {result.skipped && (
          <Badge variant="secondary" className="ml-auto">
            Skipped
          </Badge>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{duration}ms</span>
      </div>
    </button>
  );
}

// =============================================================================
// Diff View
// =============================================================================

interface DiffViewProps {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

function DiffView({ before, after }: DiffViewProps) {
  const beforeJson = JSON.stringify(before, null, 2);
  const afterJson = JSON.stringify(after, null, 2);
  const diffLines = computeSimpleDiff(beforeJson, afterJson);

  return (
    <pre className="text-xs overflow-auto">
      {diffLines.map((line, i) => (
        <div
          key={i}
          className={`px-2 ${
            line.type === "added"
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : line.type === "removed"
                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                : ""
          }`}
        >
          <span className="select-none mr-2">
            {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
          </span>
          {line.content}
        </div>
      ))}
    </pre>
  );
}

// =============================================================================
// Timeline View
// =============================================================================

interface TimelineViewProps {
  executionPath: string[];
  stepResults: Map<string, StepResult>;
  currentStepId: string | null;
}

function TimelineView({
  executionPath,
  stepResults,
  currentStepId,
}: TimelineViewProps) {
  return (
    <div className="space-y-1">
      {executionPath.map((stepId, index) => {
        const result = stepResults.get(stepId);
        const isCurrent = stepId === currentStepId;
        const isCompleted = result?.completedAt;

        return (
          <div key={stepId} className="flex items-center gap-2">
            {/* Connector */}
            {index > 0 && <div className="ml-2 h-4 w-px bg-border -mt-5" />}

            {/* Node */}
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                isCurrent
                  ? "bg-primary text-primary-foreground animate-pulse"
                  : isCompleted
                    ? result?.skipped
                      ? "bg-muted text-muted-foreground"
                      : "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </div>

            {/* Label */}
            <span
              className={`text-sm ${
                isCurrent ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {result?.stepName || stepId}
            </span>

            {/* Status */}
            {result?.skipped && (
              <Badge variant="outline" className="text-xs">
                Skipped
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TestResultsPanel({
  testState,
  onStepClick,
}: TestResultsPanelProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["timeline", "results"]),
  );

  const results = Array.from(testState.stepResults.values());
  const selectedResult = selectedStepId
    ? testState.stepResults.get(selectedStepId)
    : results[results.length - 1];

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Summary stats
  const summary = useMemo(() => {
    const completed = results.filter((r) => r.completedAt && !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    const errors = results.filter((r) => r.error).length;
    const totalTime = results.reduce((acc, r) => {
      if (r.completedAt) {
        return acc + (r.completedAt.getTime() - r.startedAt.getTime());
      }
      return acc;
    }, 0);

    return { completed, skipped, errors, totalTime };
  }, [results]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          Test Results
          {testState.status === "completed" && (
            <Badge variant="outline" className="font-normal">
              {summary.completed} completed, {summary.skipped} skipped
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4 pr-4">
            {/* Timeline Section */}
            <div>
              <button
                className="flex w-full items-center gap-1 text-sm font-medium"
                onClick={() => toggleSection("timeline")}
              >
                {expandedSections.has("timeline") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Execution Timeline
              </button>
              {expandedSections.has("timeline") && (
                <div className="mt-2 ml-1">
                  <TimelineView
                    executionPath={testState.executionPath}
                    stepResults={testState.stepResults}
                    currentStepId={testState.currentStepId}
                  />
                </div>
              )}
            </div>

            {/* Results Section */}
            {results.length > 0 && (
              <div>
                <button
                  className="flex w-full items-center gap-1 text-sm font-medium"
                  onClick={() => toggleSection("results")}
                >
                  {expandedSections.has("results") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Step Results ({results.length})
                </button>
                {expandedSections.has("results") && (
                  <div className="mt-2 space-y-1">
                    {results.map((result) => (
                      <StepResultItem
                        key={result.stepId}
                        result={result}
                        isSelected={selectedStepId === result.stepId}
                        onSelect={() => {
                          setSelectedStepId(result.stepId);
                          onStepClick?.(result.stepId);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Result Detail */}
            {selectedResult && (
              <div>
                <button
                  className="flex w-full items-center gap-1 text-sm font-medium"
                  onClick={() => toggleSection("detail")}
                >
                  {expandedSections.has("detail") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {selectedResult.stepName} - Detail
                </button>
                {expandedSections.has("detail") && (
                  <div className="mt-2">
                    <Tabs defaultValue="diff">
                      <TabsList className="h-8">
                        <TabsTrigger value="diff" className="text-xs">
                          Diff
                        </TabsTrigger>
                        <TabsTrigger value="input" className="text-xs">
                          Input
                        </TabsTrigger>
                        <TabsTrigger value="output" className="text-xs">
                          Output
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="diff" className="mt-2">
                        <div className="rounded-md border bg-muted/30 p-2">
                          <DiffView
                            before={selectedResult.input}
                            after={selectedResult.output}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="input" className="mt-2">
                        <pre className="rounded-md border bg-muted/30 p-3 text-xs overflow-auto max-h-48">
                          {JSON.stringify(selectedResult.input, null, 2)}
                        </pre>
                      </TabsContent>

                      <TabsContent value="output" className="mt-2">
                        <pre className="rounded-md border bg-muted/30 p-3 text-xs overflow-auto max-h-48">
                          {JSON.stringify(selectedResult.output, null, 2)}
                        </pre>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            )}

            {/* Summary (when completed) */}
            {testState.status === "completed" && (
              <div className="rounded-md border bg-muted/30 p-4">
                <h4 className="font-medium mb-2">Test Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Completed:</span>{" "}
                    <span className="font-medium">{summary.completed}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skipped:</span>{" "}
                    <span className="font-medium">{summary.skipped}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>{" "}
                    <span className="font-medium">{summary.errors}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Time:</span>{" "}
                    <span className="font-medium">{summary.totalTime}ms</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
