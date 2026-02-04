/**
 * DataFlowMapping - Panel for configuring data flow between steps.
 */
import { memo, useState, useCallback } from "react";
import { Plus, Trash2, AlertCircle, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NunjucksEditor } from "./NunjucksEditor";
import { TransformPreview } from "./TransformPreview";
import { useDataFlowContext } from "../hooks/useDataFlowContext";

// =============================================================================
// Types
// =============================================================================

export interface FieldMapping {
  id: string;
  targetField: string;
  expression: string;
}

export interface DataFlowMappingProps {
  /** Current step ID */
  stepId: string;
  /** Current mappings */
  mappings: FieldMapping[];
  /** Called when mappings change */
  onMappingsChange: (mappings: FieldMapping[]) => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Sample Data for Preview
// =============================================================================

const SAMPLE_INPUT_DATA = {
  id: "item_001",
  text: "Apple Inc. reported record quarterly revenue of $123 billion.",
  metadata: {
    source: "financial_news",
    timestamp: "2024-01-15T10:30:00Z",
  },
};

// =============================================================================
// Quick Insert Buttons
// =============================================================================

interface QuickInsertProps {
  onInsert: (expression: string) => void;
}

const QuickInsert = memo(function QuickInsert({ onInsert }: QuickInsertProps) {
  const paths = [
    { label: "Input Text", expr: "{{ input.text }}" },
    { label: "Input ID", expr: "{{ input.id }}" },
    { label: "Input Metadata", expr: "{{ input.metadata }}" },
    { label: "Annotations", expr: "{{ steps.annotate.output.annotations }}" },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {paths.map((p) => (
        <Button
          key={p.expr}
          variant="outline"
          size="sm"
          className="h-6 text-xs"
          onClick={() => onInsert(p.expr)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
});

// =============================================================================
// Field Mapping Row
// =============================================================================

interface MappingRowProps {
  mapping: FieldMapping;
  stepId: string;
  onChange: (mapping: FieldMapping) => void;
  onDelete: () => void;
  errors: string[];
}

const MappingRow = memo(function MappingRow({
  mapping,
  stepId,
  onChange,
  onDelete,
  errors,
}: MappingRowProps) {
  const hasErrors = errors.length > 0;

  return (
    <div className="space-y-2 p-4 rounded-lg border bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="font-medium">Target Field</Label>
          {hasErrors ? (
            <Badge variant="outline" className="text-destructive border-destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Invalid
            </Badge>
          ) : mapping.expression ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Check className="h-3 w-3 mr-1" />
              Valid
            </Badge>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <input
        type="text"
        value={mapping.targetField}
        onChange={(e) => onChange({ ...mapping, targetField: e.target.value })}
        placeholder="e.g., text, entities, labels"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />

      <div className="space-y-1">
        <Label className="text-sm">Expression</Label>
        <NunjucksEditor
          value={mapping.expression}
          onChange={(expr) => onChange({ ...mapping, expression: expr })}
          stepId={stepId}
          height={60}
        />
      </div>

      {hasErrors && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <ul className="space-y-0.5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Component
// =============================================================================

export const DataFlowMapping = memo(function DataFlowMapping({
  stepId,
  mappings,
  onMappingsChange,
  className,
}: DataFlowMappingProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [activeExpression, setActiveExpression] = useState("");
  const { validateExpression, context } = useDataFlowContext(stepId);

  // Get available sources
  const availableSources = [
    { value: "input", label: "Input Data" },
    ...Object.entries(context.steps).map(([id, info]) => ({
      value: `steps.${id}`,
      label: `${info.name} Output`,
    })),
  ];

  // Add new mapping
  const handleAddMapping = useCallback(() => {
    const newMapping: FieldMapping = {
      id: `mapping_${Date.now()}`,
      targetField: "",
      expression: "",
    };
    onMappingsChange([...mappings, newMapping]);
  }, [mappings, onMappingsChange]);

  // Update mapping
  const handleUpdateMapping = useCallback(
    (index: number, updated: FieldMapping) => {
      const newMappings = [...mappings];
      newMappings[index] = updated;
      onMappingsChange(newMappings);
      setActiveExpression(updated.expression);
    },
    [mappings, onMappingsChange]
  );

  // Delete mapping
  const handleDeleteMapping = useCallback(
    (index: number) => {
      onMappingsChange(mappings.filter((_, i) => i !== index));
    },
    [mappings, onMappingsChange]
  );

  // Validate all mappings
  const handleValidate = useCallback(() => {
    // Validation already happens per-expression
    // This could trigger a full validation pass
  }, []);

  // Get errors for a mapping
  const getErrors = (mapping: FieldMapping): string[] => {
    if (!mapping.expression) return [];
    return validateExpression(mapping.expression);
  };

  const hasAnyErrors = mappings.some((m) => getErrors(m).length > 0);

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col h-full", className)}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Data Flow Configuration</h3>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Map data from input or previous steps to this step's fields
                    using Nunjucks expressions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={hasAnyErrors}
              >
                {hasAnyErrors ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-1 text-destructive" />
                    Fix Errors
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Valid
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Mappings */}
          <div className={cn("flex-1 overflow-auto p-4", showPreview && "border-r")}>
            {/* Input Source */}
            <div className="mb-4">
              <Label className="mb-2 block">Data Source</Label>
              <Select defaultValue="input">
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSources.map((src) => (
                    <SelectItem key={src.value} value={src.value}>
                      {src.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Insert */}
            <div className="mb-4">
              <Label className="mb-2 block text-sm text-muted-foreground">
                Quick Insert
              </Label>
              <QuickInsert
                onInsert={(expr) => {
                  if (mappings.length > 0) {
                    const lastIdx = mappings.length - 1;
                    handleUpdateMapping(lastIdx, {
                      ...mappings[lastIdx],
                      expression: expr,
                    });
                  } else {
                    handleAddMapping();
                  }
                }}
              />
            </div>

            {/* Field Mappings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Field Mappings</Label>
                <Button variant="outline" size="sm" onClick={handleAddMapping}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>

              {mappings.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">
                    No field mappings defined.
                  </p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={handleAddMapping}
                  >
                    Add your first mapping
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mappings.map((mapping, index) => (
                    <MappingRow
                      key={mapping.id}
                      mapping={mapping}
                      stepId={stepId}
                      onChange={(m) => handleUpdateMapping(index, m)}
                      onDelete={() => handleDeleteMapping(index)}
                      errors={getErrors(mapping)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="w-96 flex-shrink-0">
              <TransformPreview
                expression={activeExpression}
                sampleData={SAMPLE_INPUT_DATA}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
});
