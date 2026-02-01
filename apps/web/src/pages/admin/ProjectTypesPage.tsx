import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Pencil, Trash2, Plus } from "lucide-react";
import { useProjectTypes, useDeleteProjectType } from "../../hooks/useProjectTypes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ProjectTypesPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useProjectTypes();
  const deleteProjectType = useDeleteProjectType();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (projectTypeId: string, name: string) => {
    if (!confirm(`Delete project type "${name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(projectTypeId);
    try {
      await deleteProjectType.mutateAsync(projectTypeId);
    } catch {
      alert("Failed to delete project type");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncate = (text: string | null | undefined, maxLength: number) => {
    if (!text) return "—";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="size-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Types</h1>
            <p className="text-muted-foreground">
              {data ? `${data.total} total project types` : "Loading..."}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/admin/project-types/new")}>
          <Plus className="size-4 mr-2" />
          Create Type
        </Button>
      </header>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
          Failed to load project types. Please try again.
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-card rounded-lg border p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Project Types Table */}
      {data && !isLoading && (
        <div className="bg-card rounded-lg border overflow-hidden">
          {data.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="size-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No project types yet</p>
              <p className="text-sm mt-1">
                Create your first project type to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Difficulty
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((projectType) => (
                    <tr
                      key={projectType.project_type_id}
                      className={cn(
                        "border-b border-border transition-colors",
                        "even:bg-muted/30",
                        "hover:bg-muted/50"
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {projectType.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground">
                          {truncate(projectType.description, 60)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {projectType.difficulty_level ? (
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                              projectType.difficulty_level === "easy" &&
                                "bg-green-500/10 text-green-600 dark:text-green-400",
                              projectType.difficulty_level === "medium" &&
                                "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                              projectType.difficulty_level === "hard" &&
                                "bg-red-500/10 text-red-600 dark:text-red-400"
                            )}
                          >
                            {projectType.difficulty_level}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            projectType.is_system
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {projectType.is_system ? "System" : "Custom"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(projectType.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/admin/project-types/${projectType.project_type_id}/edit`
                              )
                            }
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDelete(
                                projectType.project_type_id,
                                projectType.name
                              )
                            }
                            disabled={
                              projectType.is_system ||
                              deletingId === projectType.project_type_id
                            }
                            className={cn(
                              !projectType.is_system &&
                                "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                            )}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
