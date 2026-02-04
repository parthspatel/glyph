/**
 * ConnectionStep - Second wizard step for configuring connection settings.
 */
import { memo, useState, useCallback } from "react";
import {
  Upload,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DataSourceType } from "./SourceTypeStep";

// =============================================================================
// Types
// =============================================================================

export interface ConnectionConfig {
  // S3
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  prefix?: string;
  useIamRole?: boolean;

  // GCS
  credentialsJson?: string;

  // Azure Blob
  containerName?: string;
  connectionString?: string;

  // API
  endpoint?: string;
  authType?: "none" | "bearer" | "basic" | "api_key";
  authToken?: string;
  headers?: Record<string, string>;

  // Database
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  dbType?: "postgresql" | "mysql" | "sqlite";

  // File Upload
  uploadedFiles?: File[];
}

export interface ConnectionStepProps {
  sourceType: DataSourceType;
  config: ConnectionConfig;
  onChange: (config: ConnectionConfig) => void;
}

// =============================================================================
// Sub-components
// =============================================================================

interface S3FormProps {
  config: ConnectionConfig;
  onChange: (config: ConnectionConfig) => void;
}

const S3Form = memo(function S3Form({ config, onChange }: S3FormProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bucket">Bucket Name</Label>
          <Input
            id="bucket"
            value={config.bucket || ""}
            onChange={(e) => onChange({ ...config, bucket: e.target.value })}
            placeholder="my-annotation-data"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Select
            value={config.region || "us-east-1"}
            onValueChange={(v) => onChange({ ...config, region: v })}
          >
            <SelectTrigger id="region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
              <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
              <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
              <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prefix">Path Prefix (optional)</Label>
        <Input
          id="prefix"
          value={config.prefix || ""}
          onChange={(e) => onChange({ ...config, prefix: e.target.value })}
          placeholder="data/annotations/"
        />
      </div>

      <div className="flex items-center gap-2 mt-4">
        <input
          id="use-iam"
          type="checkbox"
          checked={config.useIamRole || false}
          onChange={(e) => onChange({ ...config, useIamRole: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="use-iam" className="font-normal">
          Use IAM Role (no credentials needed)
        </Label>
      </div>

      {!config.useIamRole && (
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="access-key">Access Key ID</Label>
            <Input
              id="access-key"
              value={config.accessKey || ""}
              onChange={(e) => onChange({ ...config, accessKey: e.target.value })}
              placeholder="AKIAIOSFODNN7EXAMPLE"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Access Key</Label>
            <div className="relative">
              <Input
                id="secret-key"
                type={showSecret ? "text" : "password"}
                value={config.secretKey || ""}
                onChange={(e) =>
                  onChange({ ...config, secretKey: e.target.value })
                }
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const GCSForm = memo(function GCSForm({ config, onChange }: S3FormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gcs-bucket">Bucket Name</Label>
        <Input
          id="gcs-bucket"
          value={config.bucket || ""}
          onChange={(e) => onChange({ ...config, bucket: e.target.value })}
          placeholder="my-gcs-bucket"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gcs-prefix">Path Prefix (optional)</Label>
        <Input
          id="gcs-prefix"
          value={config.prefix || ""}
          onChange={(e) => onChange({ ...config, prefix: e.target.value })}
          placeholder="data/annotations/"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="credentials">Service Account Credentials (JSON)</Label>
        <Textarea
          id="credentials"
          value={config.credentialsJson || ""}
          onChange={(e) =>
            onChange({ ...config, credentialsJson: e.target.value })
          }
          placeholder='{"type": "service_account", ...}'
          rows={6}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
});

const APIForm = memo(function APIForm({ config, onChange }: S3FormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="endpoint">API Endpoint URL</Label>
        <Input
          id="endpoint"
          value={config.endpoint || ""}
          onChange={(e) => onChange({ ...config, endpoint: e.target.value })}
          placeholder="https://api.example.com/data"
        />
      </div>
      <div className="space-y-2">
        <Label>Authentication</Label>
        <Select
          value={config.authType || "none"}
          onValueChange={(v) =>
            onChange({ ...config, authType: v as ConnectionConfig["authType"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Authentication</SelectItem>
            <SelectItem value="bearer">Bearer Token</SelectItem>
            <SelectItem value="basic">Basic Auth</SelectItem>
            <SelectItem value="api_key">API Key</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {config.authType && config.authType !== "none" && (
        <div className="space-y-2">
          <Label htmlFor="auth-token">
            {config.authType === "bearer"
              ? "Bearer Token"
              : config.authType === "api_key"
                ? "API Key"
                : "Credentials"}
          </Label>
          <Input
            id="auth-token"
            type="password"
            value={config.authToken || ""}
            onChange={(e) => onChange({ ...config, authToken: e.target.value })}
          />
        </div>
      )}
    </div>
  );
});

const FileUploadForm = memo(function FileUploadForm({
  config,
  onChange,
}: S3FormProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      onChange({ ...config, uploadedFiles: files });
    },
    [config, onChange]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      onChange({ ...config, uploadedFiles: files });
    },
    [config, onChange]
  );

  const files = config.uploadedFiles || [];

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <p className="font-medium">Drag and drop files here</p>
        <p className="text-sm text-muted-foreground mt-1">
          or click to browse (CSV, JSON, JSONL)
        </p>
        <input
          type="file"
          multiple
          accept=".csv,.json,.jsonl"
          onChange={handleFileInput}
          className="absolute inset-0 opacity-0 cursor-pointer"
          style={{ position: "relative" }}
        />
        <Button variant="outline" className="mt-4">
          Browse Files
        </Button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files</Label>
          <ul className="space-y-1">
            {files.map((file, i) => (
              <li
                key={i}
                className="flex items-center gap-2 p-2 rounded bg-muted text-sm"
              >
                <Check className="h-4 w-4 text-green-600" />
                {file.name}
                <span className="text-muted-foreground ml-auto">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

export const ConnectionStep = memo(function ConnectionStep({
  sourceType,
  config,
  onChange,
}: ConnectionStepProps) {
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");

  const handleTestConnection = useCallback(async () => {
    setTestStatus("testing");
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Mock success/failure
    setTestStatus(Math.random() > 0.3 ? "success" : "error");
  }, []);

  const renderForm = () => {
    switch (sourceType) {
      case "s3":
        return <S3Form config={config} onChange={onChange} />;
      case "gcs":
        return <GCSForm config={config} onChange={onChange} />;
      case "api":
        return <APIForm config={config} onChange={onChange} />;
      case "file_upload":
        return <FileUploadForm config={config} onChange={onChange} />;
      case "azure_blob":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Container Name</Label>
              <Input
                value={config.containerName || ""}
                onChange={(e) =>
                  onChange({ ...config, containerName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Connection String</Label>
              <Textarea
                value={config.connectionString || ""}
                onChange={(e) =>
                  onChange({ ...config, connectionString: e.target.value })
                }
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          </div>
        );
      case "database":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Database Type</Label>
              <Select
                value={config.dbType || "postgresql"}
                onValueChange={(v) =>
                  onChange({
                    ...config,
                    dbType: v as ConnectionConfig["dbType"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Host</Label>
                <Input
                  value={config.host || ""}
                  onChange={(e) => onChange({ ...config, host: e.target.value })}
                  placeholder="localhost"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={config.port || 5432}
                  onChange={(e) =>
                    onChange({ ...config, port: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Database Name</Label>
              <Input
                value={config.database || ""}
                onChange={(e) =>
                  onChange({ ...config, database: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={config.username || ""}
                  onChange={(e) =>
                    onChange({ ...config, username: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={config.password || ""}
                  onChange={(e) =>
                    onChange({ ...config, password: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        );
      default:
        return <p>Unknown source type</p>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Connection Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the connection to your data source
        </p>
      </div>

      {renderForm()}

      {sourceType !== "file_upload" && (
        <div className="pt-4 border-t">
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
            Test Connection
          </Button>
          {testStatus === "success" && (
            <span className="ml-3 text-sm text-green-600">
              Connection successful!
            </span>
          )}
          {testStatus === "error" && (
            <span className="ml-3 text-sm text-destructive">
              Connection failed. Check your settings.
            </span>
          )}
        </div>
      )}
    </div>
  );
});
