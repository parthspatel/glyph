/**
 * SchemaStep - Third wizard step for defining input/output schemas.
 */
import { memo, useCallback, useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchemaEditor, DEFAULT_SCHEMA } from "../SchemaEditor";

// =============================================================================
// Types
// =============================================================================

export interface SchemaConfig {
  inputSchema: string;
  outputSchema: string;
}

export interface SchemaStepProps {
  config: SchemaConfig;
  onChange: (config: SchemaConfig) => void;
  hasUploadedFiles?: boolean;
}

// =============================================================================
// Default Output Schema
// =============================================================================

const DEFAULT_OUTPUT_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Original item ID"
    },
    "annotations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "label": { "type": "string" },
          "confidence": { "type": "number" }
        }
      }
    }
  },
  "required": ["id", "annotations"]
}`;

// =============================================================================
// Component
// =============================================================================

export const SchemaStep = memo(function SchemaStep({
  config,
  onChange,
  hasUploadedFiles = false,
}: SchemaStepProps) {
  const [isInferring, setIsInferring] = useState(false);

  const handleInferSchema = useCallback(async () => {
    setIsInferring(true);
    // Simulate schema inference from uploaded files
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock inferred schema
    const inferredSchema = JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          metadata: {
            type: "object",
            properties: {
              source: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
        required: ["id", "text"],
      },
      null,
      2
    );

    onChange({ ...config, inputSchema: inferredSchema });
    setIsInferring(false);
  }, [config, onChange]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Define Data Schemas</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Specify the structure of your input data and expected annotation output
        </p>
      </div>

      {/* Input Schema */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Input Schema</h4>
            <p className="text-sm text-muted-foreground">
              Structure of data items to be annotated
            </p>
          </div>
          {hasUploadedFiles && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInferSchema}
              disabled={isInferring}
            >
              {isInferring ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Infer from File
            </Button>
          )}
        </div>
        <SchemaEditor
          label=""
          value={config.inputSchema || DEFAULT_SCHEMA}
          onChange={(inputSchema) => onChange({ ...config, inputSchema })}
          height={220}
        />
      </div>

      {/* Output Schema */}
      <div className="space-y-3">
        <div>
          <h4 className="font-medium">Output Schema</h4>
          <p className="text-sm text-muted-foreground">
            Structure of annotation results
          </p>
        </div>
        <SchemaEditor
          label=""
          value={config.outputSchema || DEFAULT_OUTPUT_SCHEMA}
          onChange={(outputSchema) => onChange({ ...config, outputSchema })}
          height={220}
        />
      </div>
    </div>
  );
});

export { DEFAULT_OUTPUT_SCHEMA };
