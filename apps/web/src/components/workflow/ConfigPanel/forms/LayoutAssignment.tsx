/**
 * LayoutAssignment - Form for assigning a layout to a workflow step.
 * Fetches available layouts and shows preview thumbnails.
 */
import { memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ExternalLink, Layout, AlertCircle, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StepSettings } from "../../types";

// =============================================================================
// Types
// =============================================================================

interface LayoutSummary {
  id: string;
  name: string;
  version: number;
  description?: string;
  preview_url?: string;
}

export interface LayoutAssignmentProps {
  /** Current layout ID */
  value?: string;
  /** Called when layout changes */
  onChange: (layoutId: string | undefined) => void;
  /** Step settings for context */
  settings?: StepSettings;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Mock API (replace with real API when available)
// =============================================================================

async function fetchLayouts(): Promise<LayoutSummary[]> {
  // TODO: Replace with actual API call to /api/v1/layouts
  // For now, return mock data
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [
    {
      id: "layout_text_classification",
      name: "Text Classification",
      version: 1,
      description: "Simple text classification with labels",
    },
    {
      id: "layout_ner_tagging",
      name: "NER Tagging",
      version: 2,
      description: "Named entity recognition with span highlighting",
    },
    {
      id: "layout_image_bounding",
      name: "Image Bounding Box",
      version: 1,
      description: "Draw bounding boxes on images",
    },
    {
      id: "layout_audio_transcription",
      name: "Audio Transcription",
      version: 1,
      description: "Transcribe audio segments with timestamps",
    },
    {
      id: "layout_relation_extraction",
      name: "Relation Extraction",
      version: 1,
      description: "Link entities with relationship types",
    },
  ];
}

// =============================================================================
// Preview Thumbnail
// =============================================================================

interface LayoutPreviewThumbnailProps {
  layout: LayoutSummary;
  size?: "small" | "large";
}

const LayoutPreviewThumbnail = memo(function LayoutPreviewThumbnail({
  layout,
  size = "small",
}: LayoutPreviewThumbnailProps) {
  const sizeClasses = size === "small" ? "w-10 h-7" : "w-full h-32";

  // If we have a preview URL, use it
  if (layout.preview_url) {
    return (
      <img
        src={layout.preview_url}
        alt={layout.name}
        className={cn(sizeClasses, "rounded border object-cover")}
      />
    );
  }

  // Otherwise show placeholder with icon
  return (
    <div
      className={cn(
        sizeClasses,
        "rounded border bg-muted/50 flex items-center justify-center"
      )}
    >
      <Layout className="h-4 w-4 text-muted-foreground" />
    </div>
  );
});

// =============================================================================
// Component
// =============================================================================

export const LayoutAssignment = memo(function LayoutAssignment({
  value,
  onChange,
  className,
}: LayoutAssignmentProps) {
  // Fetch available layouts
  const {
    data: layouts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["layouts"],
    queryFn: fetchLayouts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Find selected layout
  const selectedLayout = useMemo(() => {
    if (!value || !layouts) return null;
    return layouts.find((l) => l.id === value) ?? null;
  }, [value, layouts]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Label>Assigned Layout</Label>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading layouts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <Label>Assigned Layout</Label>
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load layouts</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Label>Assigned Layout</Label>

      <Select
        value={value || ""}
        onValueChange={(v) => onChange(v || undefined)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a layout..." />
        </SelectTrigger>
        <SelectContent>
          {layouts?.map((layout) => (
            <SelectItem key={layout.id} value={layout.id}>
              <div className="flex items-center gap-3">
                <LayoutPreviewThumbnail layout={layout} size="small" />
                <div className="flex flex-col">
                  <span className="font-medium">{layout.name}</span>
                  <span className="text-xs text-muted-foreground">
                    v{layout.version}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Selected layout preview */}
      {selectedLayout && (
        <div className="mt-4 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium">{selectedLayout.name}</h4>
              <p className="text-sm text-muted-foreground">
                Version {selectedLayout.version}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/admin/layouts/${selectedLayout.id}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {selectedLayout.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {selectedLayout.description}
            </p>
          )}
          <LayoutPreviewThumbnail layout={selectedLayout} size="large" />
        </div>
      )}

      {/* Create new layout link */}
      <Button variant="link" className="p-0 h-auto" asChild>
        <Link to="/admin/layouts/new">+ Create New Layout</Link>
      </Button>
    </div>
  );
});
