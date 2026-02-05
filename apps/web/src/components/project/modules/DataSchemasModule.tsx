/**
 * DataSchemasModule - displays schema field counts and navigates to configuration.
 */

import { useNavigate } from "react-router-dom";
import { FileJson } from "lucide-react";
import { ModuleCard } from "./ModuleCard";

export interface Schema {
  fields?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

export interface DataSchemasModuleProps {
  projectId: string;
  inputSchema?: Schema | null;
  outputSchema?: Schema | null;
}

function countFields(schema: Schema | null | undefined): number {
  if (!schema) return 0;
  // JSON Schema uses "properties", but we also check "fields" for flexibility
  const props = schema.properties || schema.fields || {};
  return Object.keys(props).length;
}

export function DataSchemasModule({
  projectId,
  inputSchema,
  outputSchema,
}: DataSchemasModuleProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/projects/${projectId}/workflow?tab=data`);
  };

  const inputCount = countFields(inputSchema);
  const outputCount = countFields(outputSchema);
  const hasSchemas = inputCount > 0 || outputCount > 0;

  // Warning if output schema is missing (required for annotation)
  const needsOutput = inputCount > 0 && outputCount === 0;

  // Build preview text
  let preview: React.ReactNode = null;
  if (hasSchemas) {
    const parts: string[] = [];
    if (inputCount > 0) parts.push(`Input: ${inputCount} fields`);
    if (outputCount > 0) parts.push(`Output: ${outputCount} fields`);
    preview = <span>{parts.join(" • ")}</span>;
  }

  return (
    <ModuleCard
      title="Data Schemas"
      icon={<FileJson />}
      status={needsOutput ? "warning" : hasSchemas ? "configured" : "unconfigured"}
      preview={preview}
      emptyText="Schemas not defined"
      emptyAction="Define Schemas"
      onClick={handleClick}
    />
  );
}
