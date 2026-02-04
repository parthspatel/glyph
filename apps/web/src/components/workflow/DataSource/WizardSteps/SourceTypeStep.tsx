/**
 * SourceTypeStep - First wizard step for selecting data source type.
 */
import { memo } from "react";
import {
  Upload,
  Cloud,
  Database,
  Globe,
  HardDrive,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export type DataSourceType =
  | "file_upload"
  | "s3"
  | "gcs"
  | "azure_blob"
  | "api"
  | "database";

export interface SourceTypeStepProps {
  value: DataSourceType | null;
  onChange: (type: DataSourceType) => void;
}

// =============================================================================
// Source Type Options
// =============================================================================

const SOURCE_TYPES: {
  type: DataSourceType;
  name: string;
  description: string;
  icon: typeof Upload;
}[] = [
  {
    type: "file_upload",
    name: "File Upload",
    description: "Upload CSV, JSON, or other files directly",
    icon: Upload,
  },
  {
    type: "s3",
    name: "Amazon S3",
    description: "Connect to an S3 bucket for batch or streaming data",
    icon: Cloud,
  },
  {
    type: "gcs",
    name: "Google Cloud Storage",
    description: "Connect to a GCS bucket",
    icon: HardDrive,
  },
  {
    type: "azure_blob",
    name: "Azure Blob Storage",
    description: "Connect to Azure Blob containers",
    icon: Server,
  },
  {
    type: "api",
    name: "REST API",
    description: "Fetch data from an external API endpoint",
    icon: Globe,
  },
  {
    type: "database",
    name: "Database",
    description: "Connect to PostgreSQL, MySQL, or other databases",
    icon: Database,
  },
];

// =============================================================================
// Component
// =============================================================================

export const SourceTypeStep = memo(function SourceTypeStep({
  value,
  onChange,
}: SourceTypeStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Select Data Source Type</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how you want to import your annotation data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SOURCE_TYPES.map((source) => {
          const Icon = source.icon;
          const isSelected = value === source.type;

          return (
            <button
              key={source.type}
              type="button"
              onClick={() => onChange(source.type)}
              className={cn(
                "flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all",
                "hover:border-primary/50 hover:bg-muted/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg mb-3",
                  isSelected ? "bg-primary/10" : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <h4 className="font-medium">{source.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {source.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
});
