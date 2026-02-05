/**
 * Workflow Designer Page.
 * Full-featured workflow configuration interface with visual canvas, YAML editor,
 * data source configuration, testing mode, and activation flow.
 */
import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Save, Loader2, Workflow } from "lucide-react";
import { useProject } from "../hooks/useProjects";
import { WorkflowDesigner } from "../components/workflow/WorkflowDesigner";
import { WorkflowTester } from "../components/workflow/Testing";
import {
  ActivationChecklist,
  ActivationSuccess,
} from "../components/workflow/Activation";
import { useCanvasStore } from "../components/workflow/stores/canvasStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// =============================================================================
// Types
// =============================================================================

type DesignerTab = "design" | "data" | "test";

// =============================================================================
// Component
// =============================================================================

export function WorkflowDesignerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab from URL or default to design
  const activeTab = (searchParams.get("tab") as DesignerTab) || "design";

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showActivationChecklist, setShowActivationChecklist] = useState(false);
  const [showActivationSuccess, setShowActivationSuccess] = useState(false);

  // Hooks
  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const { nodes, edges } = useCanvasStore();

  // Track changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setIsDirty(true);
    }
  }, [nodes, edges]);

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: string) => {
      setSearchParams({ tab });
    },
    [setSearchParams],
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!projectId) return;

    setIsSaving(true);
    try {
      // TODO: Call API to save workflow configuration
      // await saveWorkflow(projectId, { nodes, edges, config });

      // Simulate save
      await new Promise((resolve) => setTimeout(resolve, 500));

      setIsDirty(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Failed to save workflow:", error);
    } finally {
      setIsSaving(false);
    }
  }, [projectId]);

  // Handle activation
  const handleActivate = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/v1/projects/${projectId}/activate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Activation failed");
      }

      // Refetch project to get updated status
      await refetch();

      // Show success modal
      setShowActivationChecklist(false);
      setShowActivationSuccess(true);
    } catch (error) {
      console.error("Failed to activate project:", error);
    }
  }, [projectId, refetch]);

  // Handle navigation from activation
  const handleNavigateToSection = useCallback(
    (section: string) => {
      switch (section) {
        case "workflow":
          setSearchParams({ tab: "design" });
          break;
        case "data-source":
          setSearchParams({ tab: "data" });
          break;
        case "layouts":
          navigate(`/projects/${projectId}/edit`);
          break;
        case "settings":
          navigate(`/projects/${projectId}/edit`);
          break;
        default:
          break;
      }
    },
    [projectId, navigate, setSearchParams],
  );

  // Handle go to dashboard after activation
  const handleGoToDashboard = useCallback(() => {
    navigate(`/projects/${projectId}`);
  }, [projectId, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Project Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The project you're looking for doesn't exist or you don't have
            access.
          </p>
          <Button onClick={() => navigate("/projects")} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <Workflow className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-xs text-muted-foreground">Workflow Designer</p>
          </div>
          <Badge
            variant={project.status === "active" ? "default" : "secondary"}
          >
            {project.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status */}
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Last saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {isDirty && (
            <Badge variant="outline" className="text-yellow-600">
              Unsaved changes
            </Badge>
          )}

          {/* Save button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>

          {/* Activate button (only for draft projects) */}
          {project.status === "draft" && (
            <Button size="sm" onClick={() => setShowActivationChecklist(true)}>
              Activate Project
            </Button>
          )}
        </div>
      </header>

      {/* Main content with tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="data">Data Source</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="design" className="h-full m-0 p-0">
            <WorkflowDesigner className="h-full" />
          </TabsContent>
          <TabsContent value="data" className="h-full m-0 p-0">
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Data Source configuration (use DataSourceWizard component)
            </div>
          </TabsContent>
          <TabsContent value="test" className="h-full m-0 p-0">
            <WorkflowTester
              onClose={() => setSearchParams({ tab: "design" })}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Activation checklist modal */}
      <ActivationChecklist
        projectId={projectId || ""}
        projectName={project.name}
        open={showActivationChecklist}
        onOpenChange={setShowActivationChecklist}
        onActivate={handleActivate}
        onNavigate={handleNavigateToSection}
      />

      {/* Activation success modal */}
      <ActivationSuccess
        projectName={project.name}
        open={showActivationSuccess}
        onOpenChange={setShowActivationSuccess}
        onGoToDashboard={handleGoToDashboard}
        onStayHere={() => setShowActivationSuccess(false)}
      />
    </div>
  );
}
