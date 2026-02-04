/**
 * Layout Preview Page - Admin interface for authoring Nunjucks templates.
 *
 * Provides:
 * - Monaco editor with Nunjucks syntax highlighting
 * - Live preview updates on template change
 * - Device preset switching (desktop/tablet/mobile)
 * - Multiple data sources for preview
 */
import { useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import { LayoutEditorPane } from "./LayoutEditorPane";
import { PreviewPane } from "./PreviewPane";
import { DataSourceSelector } from "./DataSourceSelector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Smartphone, Tablet, Monitor } from "lucide-react";

const DEVICE_PRESETS = {
  desktop: { width: "100%", height: "100%", label: "Desktop" },
  tablet: { width: "768px", height: "1024px", label: "Tablet" },
  mobile: { width: "375px", height: "667px", label: "Mobile" },
} as const;

type DevicePreset = keyof typeof DEVICE_PRESETS;

interface LayoutVersion {
  id: string;
  version: number;
  status: "draft" | "published" | "deprecated";
  content: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  allowedComponents?: string[];
  layout?: {
    id: string;
    name: string;
    projectTypeId?: string;
  };
}

export function LayoutPreviewPage() {
  const { layoutId, versionId } = useParams<{
    layoutId: string;
    versionId?: string;
  }>();

  // Layout state
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [devicePreset, setDevicePreset] = useState<DevicePreset>("desktop");
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<
    Array<{ line: number; message: string }>
  >([]);

  // Fetch layout version
  const { data: layoutVersion, isLoading } = useQuery<LayoutVersion>({
    queryKey: ["layoutVersion", layoutId, versionId],
    queryFn: async () => {
      const version = versionId || "latest";
      const res = await fetch(
        `/api/v1/layouts/${layoutId}/versions/${version}`,
      );
      if (!res.ok) throw new Error("Failed to load layout");
      return res.json();
    },
    enabled: !!layoutId,
  });

  // Initialize content from loaded version
  useEffect(() => {
    if (layoutVersion?.content) {
      setContent(layoutVersion.content);
      setHasChanges(false);
    }
  }, [layoutVersion]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const res = await fetch(
        `/api/v1/layouts/${layoutId}/versions/${versionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      setHasChanges(false);
    },
  });

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  }, []);

  // Handle validation errors from editor
  const handleValidationErrors = useCallback(
    (errs: Array<{ line: number; message: string }>) => {
      setErrors(errs);
    },
    [],
  );

  // Save shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (hasChanges && layoutVersion?.status === "draft") {
          saveMutation.mutate(content);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, content, layoutVersion?.status, saveMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">Loading...</div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">
            {layoutVersion?.layout?.name || "Layout Editor"}
          </h1>
          <Badge
            variant={
              layoutVersion?.status === "draft" ? "secondary" : "default"
            }
          >
            {layoutVersion?.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            v{layoutVersion?.version}
          </span>
          {hasChanges && (
            <Badge variant="outline" className="text-warning">
              Unsaved changes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Device presets */}
          <div className="flex border rounded-md">
            <button
              onClick={() => setDevicePreset("desktop")}
              className={`p-2 ${devicePreset === "desktop" ? "bg-muted" : ""}`}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevicePreset("tablet")}
              className={`p-2 ${devicePreset === "tablet" ? "bg-muted" : ""}`}
              title="Tablet"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevicePreset("mobile")}
              className={`p-2 ${devicePreset === "mobile" ? "bg-muted" : ""}`}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* Save button */}
          <Button
            onClick={() => saveMutation.mutate(content)}
            disabled={
              !hasChanges ||
              layoutVersion?.status !== "draft" ||
              saveMutation.isPending
            }
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>

          {/* Publish button (draft only) */}
          {layoutVersion?.status === "draft" && (
            <Button
              variant="outline"
              onClick={() => {
                // Publish flow - TODO
              }}
              size="sm"
            >
              Publish
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup orientation="horizontal">
          {/* Editor panel */}
          <Panel defaultSize={50} minSize={30}>
            <LayoutEditorPane
              content={content}
              onChange={handleContentChange}
              onValidation={handleValidationErrors}
              inputSchema={layoutVersion?.inputSchema}
              outputSchema={layoutVersion?.outputSchema}
              allowedComponents={layoutVersion?.allowedComponents}
              readOnly={layoutVersion?.status !== "draft"}
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Preview panel */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              {/* Data source selector */}
              <DataSourceSelector
                inputSchema={layoutVersion?.inputSchema}
                projectTypeId={layoutVersion?.layout?.projectTypeId}
                value={previewData}
                onChange={setPreviewData}
              />

              {/* Preview */}
              <div className="flex-1 p-4 bg-muted/30 overflow-hidden">
                <div
                  className="h-full mx-auto bg-background border rounded-lg overflow-auto"
                  style={{
                    width: DEVICE_PRESETS[devicePreset].width,
                    maxWidth: "100%",
                  }}
                >
                  <PreviewPane
                    content={content}
                    data={previewData}
                    errors={errors}
                    settings={layoutVersion?.settings}
                  />
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
