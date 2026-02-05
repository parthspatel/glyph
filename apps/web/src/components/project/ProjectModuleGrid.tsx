/**
 * ProjectModuleGrid - displays all project configuration modules in a responsive grid.
 */

import { useUpdateProject } from "@/hooks/useProjects";
import { useProjectType } from "@/hooks/useProjectTypes";
import {
  ProjectTypeModule,
  DeadlineModule,
  TeamModule,
  SkillsModule,
  DataSourcesModule,
  DataSchemasModule,
  WorkflowModule,
  ModuleCardSkeleton,
} from "./modules";
import type { Project } from "@/api/projects";

interface ProjectModuleGridProps {
  project: Project;
  onProjectUpdate: () => void;
}

export function ProjectModuleGrid({
  project,
  onProjectUpdate,
}: ProjectModuleGridProps) {
  const updateProject = useUpdateProject();

  // Fetch project type for schema info
  const { data: projectType } = useProjectType(project.project_type_id ?? undefined);

  // Update handlers for modal-edit modules
  const handleProjectTypeUpdate = async (typeId: string | null) => {
    await updateProject.mutateAsync({
      id: project.project_id,
      data: { project_type_id: typeId ?? undefined },
    });
    onProjectUpdate();
  };

  const handleDeadlineUpdate = async (
    deadline: string | null,
    _action?: string
  ) => {
    // Deadline is not currently in Project type - would need API extension
    // For now, we'll log and show a toast
    console.log("Update deadline:", deadline, _action);
    // TODO: Implement when deadline field added to project API
    onProjectUpdate();
  };

  const handleTeamUpdate = async (teamId: string | null) => {
    // Team assignment would need API extension
    console.log("Update team:", teamId);
    // TODO: Implement when team_id field added to project API
    onProjectUpdate();
  };

  const handleSkillsUpdate = async (skillIds: string[]) => {
    // Skills would be managed through project type or separate endpoint
    console.log("Update skills:", skillIds);
    // TODO: Implement when skills endpoint added
    onProjectUpdate();
  };

  // Mock data for modules that don't have backend support yet
  // These will be replaced with real data once the API supports them
  const mockDeadline = null; // project.deadline
  const mockTeamId = null; // project.team_id
  const mockTeamName = undefined;
  const mockMemberCount = undefined;
  const mockRequiredSkills: { skill_id: string; name: string }[] = [];
  const mockDataSources: { id: string; name: string; type: string }[] = [];

  // Schema info from project type
  const inputSchema = projectType?.input_schema ?? null;
  const outputSchema = projectType?.output_schema ?? null;

  // Workflow info - check if project has workflow configured
  // This would come from a workflow API in real implementation
  const hasWorkflow = false; // project.workflow_id !== null
  const stepCount = 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Core identity */}
      <ProjectTypeModule
        projectId={project.project_id}
        projectTypeId={project.project_type_id}
        onUpdate={handleProjectTypeUpdate}
      />

      {/* Timeline */}
      <DeadlineModule
        projectId={project.project_id}
        deadline={mockDeadline}
        onUpdate={handleDeadlineUpdate}
      />

      {/* People */}
      <TeamModule
        projectId={project.project_id}
        teamId={mockTeamId}
        teamName={mockTeamName}
        memberCount={mockMemberCount}
        onUpdate={handleTeamUpdate}
      />

      {/* Requirements */}
      <SkillsModule
        projectId={project.project_id}
        requiredSkills={mockRequiredSkills}
        onUpdate={handleSkillsUpdate}
      />

      {/* Data */}
      <DataSourcesModule
        projectId={project.project_id}
        dataSources={mockDataSources}
      />

      <DataSchemasModule
        projectId={project.project_id}
        inputSchema={inputSchema}
        outputSchema={outputSchema}
      />

      {/* Process */}
      <WorkflowModule
        projectId={project.project_id}
        hasWorkflow={hasWorkflow}
        stepCount={stepCount}
      />
    </div>
  );
}

export function ProjectModuleGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <ModuleCardSkeleton key={i} />
      ))}
    </div>
  );
}
