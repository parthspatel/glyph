/**
 * StepExecutor - Execute individual workflow steps during testing.
 * Shows embedded layout preview and provides submit/skip controls.
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, SkipForward, Check, Wand2, Eye } from "lucide-react";
import type { WorkflowNode } from "../types";

// =============================================================================
// Types
// =============================================================================

interface StepExecutorProps {
  step: WorkflowNode;
  stepInput: Record<string, unknown>;
  onSubmit: (output: Record<string, unknown>) => void;
  onSkip: () => void;
  onPause: () => void;
  isPaused: boolean;
}

// =============================================================================
// Step Type Badge Colors
// =============================================================================

const stepTypeBadgeVariants: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  annotation: "default",
  review: "secondary",
  adjudication: "outline",
  condition: "secondary",
  fork: "outline",
  join: "outline",
  auto_process: "secondary",
  sub_workflow: "outline",
};

// =============================================================================
// Component
// =============================================================================

export function StepExecutor({
  step,
  stepInput,
  onSubmit,
  onSkip,
  onPause,
  isPaused,
}: StepExecutorProps) {
  const [outputJson, setOutputJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);

  const stepType = step.data.stepType;
  const layoutId = step.data.settings?.layout_id;

  // Parse output JSON
  const parseOutput = useCallback((): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(outputJson);
      setJsonError(null);
      return parsed;
    } catch (e) {
      setJsonError((e as Error).message);
      return null;
    }
  }, [outputJson]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    const output = parseOutput();
    if (output) {
      onSubmit(output);
      setOutputJson("{}");
    }
  }, [parseOutput, onSubmit]);

  // Auto-fill with mock data based on step type
  const handleAutoFill = useCallback(() => {
    let mockOutput: Record<string, unknown>;

    switch (stepType) {
      case "annotation":
        mockOutput = {
          labels: ["label_1", "label_2"],
          confidence: 0.95,
          notes: "Auto-filled annotation result",
          completed_at: new Date().toISOString(),
        };
        break;
      case "review":
        mockOutput = {
          approved: true,
          corrections: [],
          reviewer_notes: "Auto-filled review result",
          reviewed_at: new Date().toISOString(),
        };
        break;
      case "adjudication":
        mockOutput = {
          resolution: "consensus",
          final_labels: ["label_1"],
          adjudicator_notes: "Auto-filled adjudication result",
          adjudicated_at: new Date().toISOString(),
        };
        break;
      case "conditional":
        mockOutput = {
          evaluation_result: true,
          matched_branch: "true_branch",
        };
        break;
      default:
        mockOutput = {
          status: "completed",
          result: "success",
        };
    }

    setOutputJson(JSON.stringify(mockOutput, null, 2));
  }, [stepType]);

  // Render layout preview placeholder
  const renderLayoutPreview = () => {
    if (!layoutId) {
      return (
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed bg-muted/50">
          <p className="text-sm text-muted-foreground">
            No layout assigned to this step
          </p>
        </div>
      );
    }

    // In a real implementation, this would render the actual layout
    return (
      <div className="rounded-md border bg-muted/30 p-4">
        <div className="mb-2 text-xs text-muted-foreground">
          Layout Preview: {layoutId}
        </div>
        <div className="flex h-40 items-center justify-center rounded border border-dashed">
          <div className="text-center">
            <Eye className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Layout preview would render here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (Layout ID: {layoutId})
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              {step.data.label || step.id}
            </CardTitle>
            <Badge variant={stepTypeBadgeVariants[stepType] || "default"}>
              {stepType}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInput(!showInput)}
            >
              {showInput ? "Hide Input" : "Show Input"}
            </Button>
            <Button variant="ghost" size="icon" onClick={onPause}>
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {step.data.description && (
          <p className="text-sm text-muted-foreground">
            {step.data.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input data (collapsible) */}
        {showInput && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Step Input:</label>
            <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(stepInput, null, 2)}
            </pre>
          </div>
        )}

        {/* Layout preview for annotation steps */}
        {["annotation", "review", "adjudication"].includes(stepType) && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Annotation Interface:</label>
            {renderLayoutPreview()}
          </div>
        )}

        {/* Output editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Step Output:</label>
            <Button variant="ghost" size="sm" onClick={handleAutoFill}>
              <Wand2 className="mr-2 h-3 w-3" />
              Auto-fill
            </Button>
          </div>
          <Textarea
            value={outputJson}
            onChange={(e) => setOutputJson(e.target.value)}
            className="font-mono text-sm"
            rows={6}
            placeholder='{"result": "..."}'
          />
          {jsonError && (
            <p className="text-sm text-destructive">
              Invalid JSON: {jsonError}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onSkip}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={!!jsonError}>
            <Check className="mr-2 h-4 w-4" />
            Submit & Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
