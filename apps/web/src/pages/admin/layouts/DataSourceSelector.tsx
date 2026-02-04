/**
 * Data Source Selector - Choose preview data for layout testing.
 *
 * Provides three data sources:
 * 1. Manual JSON - Enter data directly
 * 2. Generate - Create mock data from schema
 * 3. Real Task - Load data from actual task snapshots
 */
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wand2, Database, FileJson } from "lucide-react";

type DataSource = "manual" | "mock" | "snapshot";

interface TaskSnapshot {
  id: string;
  status: string;
  input: Record<string, unknown>;
}

interface DataSourceSelectorProps {
  inputSchema?: Record<string, unknown>;
  projectTypeId?: string;
  value: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function DataSourceSelector({
  inputSchema,
  projectTypeId,
  value,
  onChange,
}: DataSourceSelectorProps) {
  const [source, setSource] = useState<DataSource>("manual");
  const [manualJson, setManualJson] = useState(JSON.stringify(value, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch task snapshots for "real data" option
  const { data: taskSnapshots } = useQuery<TaskSnapshot[]>({
    queryKey: ["taskSnapshots", projectTypeId],
    queryFn: async () => {
      if (!projectTypeId) return [];
      const res = await fetch(
        `/api/v1/projects/types/${projectTypeId}/sample-tasks?limit=10`,
      );
      return res.json();
    },
    enabled: !!projectTypeId && source === "snapshot",
  });

  // Generate mock data from schema
  const generateMockData = useCallback(() => {
    if (!inputSchema) {
      const defaultData = { text: "Sample input text for annotation." };
      onChange(defaultData);
      setManualJson(JSON.stringify(defaultData, null, 2));
      return;
    }

    const mock = generateFromSchema(inputSchema);
    onChange(mock);
    setManualJson(JSON.stringify(mock, null, 2));
  }, [inputSchema, onChange]);

  // Handle manual JSON change
  const handleManualChange = useCallback(
    (json: string) => {
      setManualJson(json);
      try {
        const parsed = JSON.parse(json);
        setJsonError(null);
        onChange(parsed);
      } catch {
        setJsonError("Invalid JSON");
      }
    },
    [onChange],
  );

  // Handle snapshot selection
  const handleSnapshotSelect = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      const task = taskSnapshots?.find((t) => t.id === taskId);
      if (task?.input) {
        onChange(task.input);
        setManualJson(JSON.stringify(task.input, null, 2));
      }
    },
    [taskSnapshots, onChange],
  );

  return (
    <div className="border-b p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium">Preview Data</span>
        <Badge variant="outline" className="text-xs">
          {Object.keys(value).length} fields
        </Badge>
      </div>

      <Tabs
        value={source}
        onValueChange={(v: string) => setSource(v as DataSource)}
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="manual" className="text-xs">
            <FileJson className="w-3 h-3 mr-1" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="mock" className="text-xs">
            <Wand2 className="w-3 h-3 mr-1" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="snapshot" className="text-xs">
            <Database className="w-3 h-3 mr-1" />
            Real Task
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-2">
          <Textarea
            value={manualJson}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleManualChange(e.target.value)
            }
            placeholder='{"text": "Sample input..."}'
            className="font-mono text-xs h-24"
          />
          {jsonError && (
            <p className="text-xs text-destructive mt-1">{jsonError}</p>
          )}
        </TabsContent>

        <TabsContent value="mock" className="mt-2">
          <Button
            onClick={generateMockData}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Generate from Schema
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {inputSchema
              ? "Generates mock data based on input schema"
              : "No schema defined - generates default sample"}
          </p>
        </TabsContent>

        <TabsContent value="snapshot" className="mt-2">
          {projectTypeId ? (
            <Select
              value={selectedTaskId ?? ""}
              onValueChange={handleSnapshotSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a task..." />
              </SelectTrigger>
              <SelectContent>
                {taskSnapshots?.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.id.slice(0, 8)}... - {task.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">
              Save layout to a project type to load real tasks
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Generate mock data from a JSON Schema.
 */
function generateFromSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties =
    (schema as { properties?: Record<string, unknown> }).properties || {};

  for (const [key, prop] of Object.entries(properties)) {
    const p = prop as { type?: string; items?: unknown; default?: unknown };

    // Use default if available
    if (p.default !== undefined) {
      result[key] = p.default;
      continue;
    }

    // Generate based on type
    switch (p.type) {
      case "string":
        result[key] = `Sample ${key}`;
        break;
      case "number":
      case "integer":
        result[key] = 42;
        break;
      case "boolean":
        result[key] = true;
        break;
      case "array":
        result[key] = [];
        break;
      case "object":
        result[key] = {};
        break;
      default:
        result[key] = null;
    }
  }

  return result;
}
