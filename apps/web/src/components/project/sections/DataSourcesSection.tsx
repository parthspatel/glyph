/**
 * Data sources configuration section.
 * Lists existing sources and allows adding new ones.
 */

import { useState } from "react";
import {
  useDataSources,
  useCreateDataSource,
  useTestDataSourceConnection,
} from "../../../hooks/useDataSources";

interface DataSourcesSectionProps {
  projectId?: string;
}

const SOURCE_TYPES = [
  {
    value: "file_upload",
    label: "File Upload",
    description: "Upload files directly",
  },
  { value: "s3", label: "Amazon S3", description: "Connect to S3 bucket" },
  {
    value: "gcs",
    label: "Google Cloud Storage",
    description: "Connect to GCS bucket",
  },
  {
    value: "azure_blob",
    label: "Azure Blob Storage",
    description: "Connect to Azure container",
  },
  { value: "api", label: "API Endpoint", description: "Fetch from REST API" },
];

export function DataSourcesSection({ projectId }: DataSourcesSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    source_type: "file_upload",
    config: {},
  });

  const { data: dataSources, isLoading } = useDataSources(projectId);
  const createDataSource = useCreateDataSource();
  const testConnection = useTestDataSourceConnection();

  // If no project ID yet (creating new project), show placeholder
  if (!projectId) {
    return (
      <div className="data-sources-placeholder">
        <div className="placeholder-icon">📁</div>
        <h4>Data Sources</h4>
        <p>Save the project first, then add data sources.</p>
        <p className="text-sm text-gray-500">
          Data sources define where your annotation tasks come from.
        </p>
      </div>
    );
  }

  const handleAddSource = async () => {
    if (!newSource.name || !projectId) return;

    try {
      await createDataSource.mutateAsync({
        projectId,
        data: {
          name: newSource.name,
          source_type: newSource.source_type,
          config: newSource.config,
        },
      });
      setShowAddForm(false);
      setNewSource({ name: "", source_type: "file_upload", config: {} });
    } catch (error) {
      console.error("Failed to create data source:", error);
    }
  };

  const handleTestConnection = async (dataSourceId: string) => {
    if (!projectId) return;
    try {
      const result = await testConnection.mutateAsync({
        projectId,
        dataSourceId,
      });
      alert(
        result.success
          ? "Connection successful!"
          : `Connection failed: ${result.message}`,
      );
    } catch (error) {
      alert("Connection test failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Data Sources */}
      {isLoading ? (
        <div className="loading-state">Loading data sources...</div>
      ) : dataSources && dataSources.items.length > 0 ? (
        <div className="data-sources-list">
          {dataSources.items.map((source) => (
            <div key={source.data_source_id} className="data-source-card">
              <div className="data-source-header">
                <div className="data-source-icon">
                  {getSourceIcon(source.source_type)}
                </div>
                <div className="data-source-info">
                  <h4 className="data-source-name">{source.name}</h4>
                  <p className="data-source-type">{source.source_type}</p>
                </div>
                <div className="data-source-status">
                  {source.is_active ? (
                    <span className="status-badge status-active">Active</span>
                  ) : (
                    <span className="status-badge status-inactive">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <div className="data-source-stats">
                <span>{source.item_count} items</span>
                {source.error_count > 0 && (
                  <span className="text-red-600">
                    {source.error_count} errors
                  </span>
                )}
                {source.last_sync_at && (
                  <span>
                    Last sync:{" "}
                    {new Date(source.last_sync_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="data-source-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => handleTestConnection(source.data_source_id)}
                >
                  Test Connection
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No data sources configured yet.</p>
        </div>
      )}

      {/* Add Data Source Form */}
      {showAddForm ? (
        <div className="add-source-form">
          <h4 className="form-section-title">Add Data Source</h4>

          <div className="form-field">
            <label className="form-label">Name</label>
            <input
              type="text"
              value={newSource.name}
              onChange={(e) =>
                setNewSource({ ...newSource, name: e.target.value })
              }
              className="form-input"
              placeholder="e.g., Production Data"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Source Type</label>
            <div className="source-type-grid">
              {SOURCE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`source-type-option ${newSource.source_type === type.value ? "selected" : ""}`}
                  onClick={() =>
                    setNewSource({
                      ...newSource,
                      source_type: type.value,
                      config: {},
                    })
                  }
                >
                  <span className="source-type-icon">
                    {getSourceIcon(type.value)}
                  </span>
                  <span className="source-type-label">{type.label}</span>
                  <span className="source-type-desc">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Config fields based on source type */}
          {newSource.source_type === "s3" && (
            <S3ConfigFields
              config={newSource.config}
              onChange={(config) => setNewSource({ ...newSource, config })}
            />
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddSource}
              disabled={!newSource.name || createDataSource.isPending}
            >
              {createDataSource.isPending ? "Adding..." : "Add Source"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-outline w-full"
          onClick={() => setShowAddForm(true)}
        >
          + Add Data Source
        </button>
      )}
    </div>
  );
}

function S3ConfigFields({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="config-fields space-y-3">
      <div className="form-field">
        <label className="form-label">Bucket Name</label>
        <input
          type="text"
          value={(config.bucket as string) || ""}
          onChange={(e) => onChange({ ...config, bucket: e.target.value })}
          className="form-input"
          placeholder="my-bucket"
        />
      </div>
      <div className="form-field">
        <label className="form-label">Region</label>
        <input
          type="text"
          value={(config.region as string) || ""}
          onChange={(e) => onChange({ ...config, region: e.target.value })}
          className="form-input"
          placeholder="us-east-1"
        />
      </div>
      <div className="form-field">
        <label className="form-label">Prefix (optional)</label>
        <input
          type="text"
          value={(config.prefix as string) || ""}
          onChange={(e) => onChange({ ...config, prefix: e.target.value })}
          className="form-input"
          placeholder="data/annotations/"
        />
      </div>
    </div>
  );
}

function getSourceIcon(sourceType: string): string {
  const icons: Record<string, string> = {
    file_upload: "📤",
    s3: "☁️",
    gcs: "🌐",
    azure_blob: "💠",
    api: "🔗",
  };
  return icons[sourceType] || "📁";
}
