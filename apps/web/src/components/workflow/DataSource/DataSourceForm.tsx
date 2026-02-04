/**
 * DataSourceForm - Direct form for editing existing data sources.
 */
import { memo, useState, useCallback } from "react";
import { Save, Trash2, RefreshCw, Loader2, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ConnectionStep } from "./WizardSteps/ConnectionStep";
import { SchemaEditor, DEFAULT_SCHEMA } from "./SchemaEditor";
import { DEFAULT_OUTPUT_SCHEMA } from "./WizardSteps/SchemaStep";
import type { DataSourceConfig } from "./DataSourceWizard";
import type { DataSourceType } from "./WizardSteps/SourceTypeStep";

// =============================================================================
// Types
// =============================================================================

export interface DataSourceFormProps {
  /** Current configuration */
  config: DataSourceConfig;
  /** Called when config is saved */
  onSave: (config: DataSourceConfig) => void;
  /** Called when data source is deleted */
  onDelete: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Collapsible Section
// =============================================================================

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section = memo(function Section({
  title,
  defaultOpen = true,
  children,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-4 text-left"
      >
        <h3 className="font-medium">{title}</h3>
        <span className="text-muted-foreground">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <div className="p-4 pt-0 border-t">{children}</div>}
    </div>
  );
});

// =============================================================================
// Component
// =============================================================================

export const DataSourceForm = memo(function DataSourceForm({
  config,
  onSave,
  onDelete,
  className,
}: DataSourceFormProps) {
  const [name, setName] = useState(config.name);
  const [connection, setConnection] = useState(config.connection);
  const [inputSchema, setInputSchema] = useState(
    config.schema.inputSchema || DEFAULT_SCHEMA
  );
  const [outputSchema, setOutputSchema] = useState(
    config.schema.outputSchema || DEFAULT_OUTPUT_SCHEMA
  );

  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      onSave({
        ...config,
        name,
        connection,
        schema: {
          inputSchema,
          outputSchema,
        },
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [config, name, connection, inputSchema, outputSchema, onSave]);

  const handleTestConnection = useCallback(async () => {
    setTestStatus("testing");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setTestStatus(Math.random() > 0.3 ? "success" : "error");
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="ds-name">Data Source Name</Label>
          <Input
            id="ds-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              handleChange();
            }}
            className="max-w-md"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testStatus === "testing"}
          >
            {testStatus === "testing" && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {testStatus === "success" && (
              <Check className="h-4 w-4 mr-2 text-green-600" />
            )}
            {testStatus === "error" && (
              <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
            )}
            <RefreshCw className="h-4 w-4 mr-2" />
            Test Connection
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Data Source?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All tasks using this data source
                  will be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Connection Section */}
      <Section title="Connection Settings">
        {config.sourceType && (
          <ConnectionStep
            sourceType={config.sourceType as DataSourceType}
            config={connection}
            onChange={(c) => {
              setConnection(c);
              handleChange();
            }}
          />
        )}
      </Section>

      {/* Input Schema Section */}
      <Section title="Input Schema">
        <SchemaEditor
          label="JSON Schema for input data"
          value={inputSchema}
          onChange={(v) => {
            setInputSchema(v);
            handleChange();
          }}
          height={300}
        />
      </Section>

      {/* Output Schema Section */}
      <Section title="Output Schema" defaultOpen={false}>
        <SchemaEditor
          label="JSON Schema for annotation output"
          value={outputSchema}
          onChange={(v) => {
            setOutputSchema(v);
            handleChange();
          }}
          height={300}
        />
      </Section>
    </div>
  );
});
