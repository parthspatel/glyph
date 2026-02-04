/**
 * ConfirmStep - Fourth wizard step for reviewing and confirming settings.
 */
import { memo } from "react";
import {
  Check,
  AlertCircle,
  Cloud,
  Upload,
  Globe,
  Database,
  HardDrive,
  Server,
  FileJson,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DataSourceType } from "./SourceTypeStep";
import type { ConnectionConfig } from "./ConnectionStep";
import type { SchemaConfig } from "./SchemaStep";

// =============================================================================
// Types
// =============================================================================

export interface ConfirmStepProps {
  sourceType: DataSourceType;
  connection: ConnectionConfig;
  schema: SchemaConfig;
  name: string;
  onNameChange: (name: string) => void;
}

// =============================================================================
// Helpers
// =============================================================================

const SOURCE_TYPE_INFO: Record<
  DataSourceType,
  { name: string; icon: typeof Cloud }
> = {
  file_upload: { name: "File Upload", icon: Upload },
  s3: { name: "Amazon S3", icon: Cloud },
  gcs: { name: "Google Cloud Storage", icon: HardDrive },
  azure_blob: { name: "Azure Blob Storage", icon: Server },
  api: { name: "REST API", icon: Globe },
  database: { name: "Database", icon: Database },
};

interface ValidationResult {
  valid: boolean;
  message: string;
}

function validateConfig(
  sourceType: DataSourceType,
  connection: ConnectionConfig,
  schema: SchemaConfig
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check source type specific requirements
  switch (sourceType) {
    case "s3":
      results.push({
        valid: !!connection.bucket,
        message: "S3 bucket configured",
      });
      results.push({
        valid: connection.useIamRole || !!connection.accessKey,
        message: "Authentication configured",
      });
      break;
    case "gcs":
      results.push({
        valid: !!connection.bucket,
        message: "GCS bucket configured",
      });
      results.push({
        valid: !!connection.credentialsJson,
        message: "Service account credentials provided",
      });
      break;
    case "api":
      results.push({
        valid: !!connection.endpoint,
        message: "API endpoint configured",
      });
      break;
    case "file_upload":
      results.push({
        valid: (connection.uploadedFiles?.length ?? 0) > 0,
        message: "Files uploaded",
      });
      break;
    case "database":
      results.push({
        valid: !!connection.host && !!connection.database,
        message: "Database connection configured",
      });
      break;
  }

  // Check schemas
  try {
    const inputSchema = JSON.parse(schema.inputSchema);
    results.push({
      valid: inputSchema.type === "object",
      message: "Input schema is valid JSON Schema",
    });
  } catch {
    results.push({
      valid: false,
      message: "Input schema is valid JSON",
    });
  }

  try {
    const outputSchema = JSON.parse(schema.outputSchema);
    results.push({
      valid: outputSchema.type === "object",
      message: "Output schema is valid JSON Schema",
    });
  } catch {
    results.push({
      valid: false,
      message: "Output schema is valid JSON",
    });
  }

  return results;
}

// =============================================================================
// Component
// =============================================================================

export const ConfirmStep = memo(function ConfirmStep({
  sourceType,
  connection,
  schema,
  name,
  onNameChange,
}: ConfirmStepProps) {
  const sourceInfo = SOURCE_TYPE_INFO[sourceType];
  const Icon = sourceInfo.icon;
  const validations = validateConfig(sourceType, connection, schema);
  const allValid = validations.every((v) => v.valid);

  // Get connection summary based on type
  const getConnectionSummary = () => {
    switch (sourceType) {
      case "s3":
        return `s3://${connection.bucket}${connection.prefix ? `/${connection.prefix}` : ""}`;
      case "gcs":
        return `gs://${connection.bucket}${connection.prefix ? `/${connection.prefix}` : ""}`;
      case "api":
        return connection.endpoint;
      case "file_upload":
        const files = connection.uploadedFiles || [];
        return `${files.length} file(s) uploaded`;
      case "database":
        return `${connection.dbType}://${connection.host}:${connection.port}/${connection.database}`;
      case "azure_blob":
        return connection.containerName;
      default:
        return "—";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Review & Confirm</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Review your data source configuration before creating
        </p>
      </div>

      {/* Data Source Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Data Source Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2"
          placeholder="My Data Source"
        />
      </div>

      {/* Summary Card */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        {/* Source Type */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{sourceInfo.name}</p>
            <p className="text-sm text-muted-foreground">
              {getConnectionSummary()}
            </p>
          </div>
        </div>

        {/* Schema Summary */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <FileJson className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Schemas Defined</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">Input Schema</Badge>
              <Badge variant="outline">Output Schema</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Checklist */}
      <div className="space-y-3">
        <h4 className="font-medium">Validation Checks</h4>
        <div className="space-y-2">
          {validations.map((validation, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 p-2 rounded",
                validation.valid ? "bg-green-500/10" : "bg-destructive/10"
              )}
            >
              {validation.valid ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  "text-sm",
                  validation.valid ? "text-green-700" : "text-destructive"
                )}
              >
                {validation.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!allValid && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-700">
            Please fix the validation errors before creating the data source.
          </p>
        </div>
      )}
    </div>
  );
});
