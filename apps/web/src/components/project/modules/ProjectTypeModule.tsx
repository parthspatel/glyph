/**
 * ProjectTypeModule - displays project type and provides modal selection.
 */

import * as React from "react";
import { FileType, Check } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { useProjectTypes } from "@/hooks/useProjectTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ProjectTypeModuleProps {
  projectId: string;
  projectTypeId: string | null;
  onUpdate: (typeId: string | null) => Promise<void>;
}

export function ProjectTypeModule({
  projectId: _projectId,
  projectTypeId,
  onUpdate,
}: ProjectTypeModuleProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    projectTypeId,
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const { data: typesResponse, isLoading: typesLoading } = useProjectTypes();
  const projectTypes = typesResponse?.items ?? [];

  // Find current type name
  const currentType = projectTypes.find(
    (t) => t.project_type_id === projectTypeId,
  );

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedId(projectTypeId);
    }
  }, [open, projectTypeId]);

  const handleSave = async () => {
    if (selectedId === projectTypeId) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(selectedId);
      setOpen(false);
    } catch (error) {
      console.error("Failed to update project type:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const preview = currentType ? <span>{currentType.name}</span> : null;

  return (
    <>
      <ModuleCard
        title="Project Type"
        icon={<FileType />}
        status={projectTypeId ? "configured" : "unconfigured"}
        preview={preview}
        emptyText="No type selected"
        emptyAction="Select Type"
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Project Type</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-64 overflow-y-auto py-2">
            {typesLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : projectTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No project types available.
              </p>
            ) : (
              projectTypes.map((type) => {
                const isSelected = selectedId === type.project_type_id;
                return (
                  <button
                    key={type.project_type_id}
                    type="button"
                    onClick={() => setSelectedId(type.project_type_id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {type.name}
                      </p>
                      {type.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {type.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="size-5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {projectTypeId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setSelectedId(null)}
            >
              Clear selection
            </Button>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
