/**
 * DataSourceWizard - Multi-step wizard for data source setup.
 */
import { memo, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SourceTypeStep,
  ConnectionStep,
  SchemaStep,
  ConfirmStep,
  DEFAULT_OUTPUT_SCHEMA,
} from "./WizardSteps";
import { DEFAULT_SCHEMA } from "./SchemaEditor";
import type { DataSourceType } from "./WizardSteps/SourceTypeStep";
import type { ConnectionConfig } from "./WizardSteps/ConnectionStep";
import type { SchemaConfig } from "./WizardSteps/SchemaStep";

// =============================================================================
// Types
// =============================================================================

export interface DataSourceConfig {
  name: string;
  sourceType: DataSourceType | null;
  connection: ConnectionConfig;
  schema: SchemaConfig;
}

export interface DataSourceWizardProps {
  /** Called when wizard completes */
  onComplete: (config: DataSourceConfig) => void;
  /** Called when wizard is cancelled */
  onCancel?: () => void;
  /** Initial config for editing */
  initialConfig?: Partial<DataSourceConfig>;
}

// =============================================================================
// Constants
// =============================================================================

const STEPS = [
  { id: 1, name: "Source Type", description: "Choose data source" },
  { id: 2, name: "Connection", description: "Configure connection" },
  { id: 3, name: "Schema", description: "Define data structure" },
  { id: 4, name: "Confirm", description: "Review and create" },
];

// =============================================================================
// Step Indicator
// =============================================================================

interface StepIndicatorProps {
  currentStep: number;
  steps: typeof STEPS;
}

const StepIndicator = memo(function StepIndicator({
  currentStep,
  steps,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isComplete = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <li
              key={step.id}
              className={cn(
                "relative",
                index !== steps.length - 1 && "flex-1"
              )}
            >
              <div className="flex items-center">
                {/* Step circle */}
                <div
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isComplete
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                        ? "border-primary bg-background text-primary"
                        : "border-muted bg-background text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>

                {/* Connector line */}
                {index !== steps.length - 1 && (
                  <div
                    className={cn(
                      "ml-2 h-0.5 flex-1 transition-colors",
                      isComplete ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>

              {/* Step label */}
              <div className="mt-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

// =============================================================================
// Component
// =============================================================================

export const DataSourceWizard = memo(function DataSourceWizard({
  onComplete,
  onCancel,
  initialConfig,
}: DataSourceWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wizard state
  const [sourceType, setSourceType] = useState<DataSourceType | null>(
    initialConfig?.sourceType ?? null
  );
  const [connection, setConnection] = useState<ConnectionConfig>(
    initialConfig?.connection ?? {}
  );
  const [schema, setSchema] = useState<SchemaConfig>(
    initialConfig?.schema ?? {
      inputSchema: DEFAULT_SCHEMA,
      outputSchema: DEFAULT_OUTPUT_SCHEMA,
    }
  );
  const [name, setName] = useState(initialConfig?.name ?? "");

  // Navigation
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 1:
        return sourceType !== null;
      case 2:
        // Basic validation for connection
        if (sourceType === "file_upload") {
          return (connection.uploadedFiles?.length ?? 0) > 0;
        }
        if (sourceType === "s3") {
          return !!connection.bucket;
        }
        if (sourceType === "api") {
          return !!connection.endpoint;
        }
        return true;
      case 3:
        // Schemas must be valid JSON
        try {
          JSON.parse(schema.inputSchema);
          JSON.parse(schema.outputSchema);
          return true;
        } catch {
          return false;
        }
      case 4:
        return name.trim().length > 0;
      default:
        return false;
    }
  }, [currentStep, sourceType, connection, schema, name]);

  const handleNext = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!sourceType) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onComplete({
        name,
        sourceType,
        connection,
        schema,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [name, sourceType, connection, schema, onComplete]);

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <SourceTypeStep value={sourceType} onChange={setSourceType} />;
      case 2:
        return sourceType ? (
          <ConnectionStep
            sourceType={sourceType}
            config={connection}
            onChange={setConnection}
          />
        ) : null;
      case 3:
        return (
          <SchemaStep
            config={schema}
            onChange={setSchema}
            hasUploadedFiles={
              sourceType === "file_upload" &&
              (connection.uploadedFiles?.length ?? 0) > 0
            }
          />
        );
      case 4:
        return sourceType ? (
          <ConfirmStep
            sourceType={sourceType}
            connection={connection}
            schema={schema}
            name={name}
            onNameChange={setName}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      {/* Step Content */}
      <div className="min-h-[400px]">{renderStepContent()}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <div>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}

          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={!canGoNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canGoNext || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Create Data Source
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
