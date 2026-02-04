/**
 * ConditionEditor - Form for editing transition conditions.
 * Used for Condition nodes to define branching logic.
 */
import { memo, useState, useCallback } from "react";
import { Plus, Trash2, Info, Code } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StepSettings, TransitionConditionType } from "../../types";

// =============================================================================
// Types
// =============================================================================

export interface ConditionEditorProps {
  /** Current settings */
  settings: StepSettings;
  /** Called when settings change */
  onChange: (updates: Partial<StepSettings>) => void;
  /** Additional class names */
  className?: string;
}

interface ExpressionPart {
  id: string;
  variable: string;
  operator: string;
  value: string;
  connector?: "AND" | "OR";
}

// =============================================================================
// Constants
// =============================================================================

const CONDITION_TYPES: { value: TransitionConditionType; label: string; description: string }[] = [
  { value: "always", label: "Always", description: "Transition always occurs" },
  { value: "on_complete", label: "On Complete", description: "When step completes successfully" },
  { value: "on_agreement", label: "On Agreement", description: "When annotators agree" },
  { value: "on_disagreement", label: "On Disagreement", description: "When annotators disagree" },
  { value: "expression", label: "Custom Expression", description: "Define custom logic" },
];

const VARIABLES = [
  { value: "annotations.count", label: "Annotation Count" },
  { value: "consensus.score", label: "Consensus Score" },
  { value: "consensus.agreed", label: "Consensus Agreed" },
  { value: "step.duration_minutes", label: "Step Duration (min)" },
  { value: "task.priority", label: "Task Priority" },
  { value: "task.retries", label: "Task Retries" },
];

const OPERATORS = [
  { value: "==", label: "equals (==)" },
  { value: "!=", label: "not equals (!=)" },
  { value: ">", label: "greater than (>)" },
  { value: ">=", label: "greater or equal (>=)" },
  { value: "<", label: "less than (<)" },
  { value: "<=", label: "less or equal (<=)" },
  { value: "contains", label: "contains" },
];

// =============================================================================
// Expression Builder Row
// =============================================================================

interface ExpressionRowProps {
  part: ExpressionPart;
  isFirst: boolean;
  isLast: boolean;
  onChange: (part: ExpressionPart) => void;
  onDelete: () => void;
}

const ExpressionRow = memo(function ExpressionRow({
  part,
  isFirst,
  isLast,
  onChange,
  onDelete,
}: ExpressionRowProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Connector (AND/OR) for non-first rows */}
      {!isFirst && (
        <Select
          value={part.connector || "AND"}
          onValueChange={(v) => onChange({ ...part, connector: v as "AND" | "OR" })}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND</SelectItem>
            <SelectItem value="OR">OR</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Variable */}
      <Select
        value={part.variable}
        onValueChange={(v) => onChange({ ...part, variable: v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Select variable..." />
        </SelectTrigger>
        <SelectContent>
          {VARIABLES.map((v) => (
            <SelectItem key={v.value} value={v.value}>
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator */}
      <Select
        value={part.operator}
        onValueChange={(v) => onChange({ ...part, operator: v })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Operator..." />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value */}
      <Input
        value={part.value}
        onChange={(e) => onChange({ ...part, value: e.target.value })}
        placeholder="Value"
        className="w-24"
      />

      {/* Delete button */}
      {!isLast || !isFirst ? (
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      ) : (
        <div className="w-9" /> // Spacer
      )}
    </div>
  );
});

// =============================================================================
// Component
// =============================================================================

export const ConditionEditor = memo(function ConditionEditor({
  settings,
  onChange,
  className,
}: ConditionEditorProps) {
  const [conditionType, setConditionType] = useState<TransitionConditionType>("on_complete");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expressionParts, setExpressionParts] = useState<ExpressionPart[]>([
    { id: "1", variable: "", operator: "==", value: "" },
  ]);

  // Build expression string from parts
  const buildExpression = useCallback((parts: ExpressionPart[]): string => {
    return parts
      .map((part, i) => {
        const prefix = i > 0 && part.connector ? ` ${part.connector} ` : "";
        if (!part.variable || !part.operator) return "";
        return `${prefix}${part.variable} ${part.operator} ${part.value}`;
      })
      .filter(Boolean)
      .join("");
  }, []);

  // Add new expression part
  const addPart = useCallback(() => {
    setExpressionParts((prev) => [
      ...prev,
      { id: String(Date.now()), variable: "", operator: "==", value: "", connector: "AND" },
    ]);
  }, []);

  // Update expression part
  const updatePart = useCallback((index: number, part: ExpressionPart) => {
    setExpressionParts((prev) => {
      const newParts = [...prev];
      newParts[index] = part;
      const expression = buildExpression(newParts);
      // Update settings with new expression
      onChange({ condition: expression });
      return newParts;
    });
  }, [buildExpression, onChange]);

  // Delete expression part
  const deletePart = useCallback((index: number) => {
    setExpressionParts((prev) => {
      if (prev.length <= 1) return prev;
      const newParts = prev.filter((_, i) => i !== index);
      const expression = buildExpression(newParts);
      onChange({ condition: expression });
      return newParts;
    });
  }, [buildExpression, onChange]);

  // Handle condition type change
  const handleTypeChange = useCallback((type: TransitionConditionType) => {
    setConditionType(type);
    // For non-expression types, clear custom expression
    if (type !== "expression") {
      onChange({ condition: undefined });
    }
  }, [onChange]);

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* Condition Type */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Condition Type</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Determines when this transition should be triggered. Use
                  "Custom Expression" for complex logic.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Select value={conditionType} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col">
                    <span>{type.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {type.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expression Builder (for custom expression) */}
        {conditionType === "expression" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Expression Builder</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Code className="h-4 w-4 mr-1" />
                {showAdvanced ? "Hide" : "Show"} Raw
              </Button>
            </div>

            {/* Visual builder */}
            {!showAdvanced && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                {expressionParts.map((part, index) => (
                  <ExpressionRow
                    key={part.id}
                    part={part}
                    isFirst={index === 0}
                    isLast={index === expressionParts.length - 1}
                    onChange={(p) => updatePart(index, p)}
                    onDelete={() => deletePart(index)}
                  />
                ))}

                <Button variant="outline" size="sm" onClick={addPart}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
              </div>
            )}

            {/* Raw expression editor */}
            {showAdvanced && (
              <div className="space-y-2">
                <Textarea
                  value={settings.condition || buildExpression(expressionParts)}
                  onChange={(e) => onChange({ condition: e.target.value })}
                  placeholder="consensus.score >= 0.8 AND annotations.count >= 2"
                  className="font-mono text-sm"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Use variables like <code>consensus.score</code>,{" "}
                  <code>annotations.count</code>, etc.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Threshold for agreement conditions */}
        {(conditionType === "on_agreement" ||
          conditionType === "on_disagreement") && (
          <div className="space-y-2">
            <Label>Agreement Threshold</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              defaultValue={0.8}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Threshold for determining agreement (0.0 - 1.0)
            </p>
          </div>
        )}

        {/* Branch Labels */}
        <div className="space-y-2">
          <Label>Branch Label</Label>
          <Input
            placeholder="e.g., 'Approved', 'Needs Review'"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Label shown on the transition arrow in the visual editor
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
});
