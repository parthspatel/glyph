/**
 * WorkflowDesigner - Main container for the workflow editor.
 * Provides Visual/YAML tab toggle with bidirectional sync.
 */
import { memo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GitGraph, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowCanvas } from "./Canvas/WorkflowCanvas";
import { NodePalette } from "./Sidebar/NodePalette";
import { StepConfigPanel } from "./ConfigPanel/StepConfigPanel";
import { WorkflowYamlEditor } from "./YamlEditor/WorkflowYamlEditor";
import { useYamlSync } from "./hooks/useYamlSync";

// =============================================================================
// Types
// =============================================================================

export interface WorkflowDesignerProps {
  /** Optional class name for the container */
  className?: string;
  /** Whether to show the YAML tab */
  showYamlTab?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export const WorkflowDesigner = memo(function WorkflowDesigner({
  className,
  showYamlTab = true,
}: WorkflowDesignerProps) {
  const {
    activeTab,
    setActiveTab,
    yamlContent,
    setYamlContent,
    validationErrors,
    yamlDirty,
  } = useYamlSync();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "visual" | "yaml")}
        className="flex flex-col h-full"
      >
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b px-4">
          <TabsList className="h-12 bg-transparent">
            <TabsTrigger
              value="visual"
              className="flex items-center gap-2 data-[state=active]:bg-muted"
            >
              <GitGraph className="h-4 w-4" />
              Visual
            </TabsTrigger>
            {showYamlTab && (
              <TabsTrigger
                value="yaml"
                className="flex items-center gap-2 data-[state=active]:bg-muted"
              >
                <FileCode2 className="h-4 w-4" />
                YAML
                {yamlDirty && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Error indicator when on visual tab but YAML has errors */}
          {activeTab === "visual" && validationErrors.length > 0 && (
            <div className="text-xs text-amber-600">
              YAML has {validationErrors.length} error(s)
            </div>
          )}
        </div>

        {/* Visual tab content */}
        <TabsContent value="visual" className="flex-1 m-0 data-[state=inactive]:hidden">
          <div className="flex h-full">
            {/* Left sidebar: Node palette */}
            <NodePalette className="w-64 border-r shrink-0" />

            {/* Center: Canvas */}
            <div className="flex-1 relative">
              <WorkflowCanvas />
            </div>

            {/* Right: Config panel (conditionally rendered) */}
            <StepConfigPanel />
          </div>
        </TabsContent>

        {/* YAML tab content */}
        {showYamlTab && (
          <TabsContent value="yaml" className="flex-1 m-0 data-[state=inactive]:hidden">
            <WorkflowYamlEditor
              value={yamlContent}
              onChange={setYamlContent}
              className="h-full"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
});
