/**
 * DataSourcesModule - displays data sources preview and navigates to configuration.
 */

import { useNavigate } from "react-router-dom";
import { Database } from "lucide-react";
import { ModuleCard } from "./ModuleCard";

export interface DataSource {
  id: string;
  name: string;
  type: string; // 's3', 'api', 'local', etc.
}

export interface DataSourcesModuleProps {
  projectId: string;
  dataSources: DataSource[];
}

export function DataSourcesModule({
  projectId,
  dataSources,
}: DataSourcesModuleProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/projects/${projectId}/workflow?tab=data`);
  };

  // Build preview text
  let preview: React.ReactNode = null;
  if (dataSources.length > 0) {
    const sourceNames = dataSources.slice(0, 2).map((s) => s.name);
    const suffix = dataSources.length > 2 ? "..." : "";
    preview = (
      <span>
        {dataSources.length} source{dataSources.length > 1 ? "s" : ""}:{" "}
        {sourceNames.join(", ")}
        {suffix}
      </span>
    );
  }

  return (
    <ModuleCard
      title="Data Sources"
      icon={<Database />}
      status={dataSources.length > 0 ? "configured" : "unconfigured"}
      preview={preview}
      emptyText="No data sources configured"
      emptyAction="Add Source"
      onClick={handleClick}
    />
  );
}
