/**
 * Project module components barrel export.
 */

// Base components
export { ModuleCard } from "./ModuleCard";
export type { ModuleCardProps } from "./ModuleCard";
export { ModuleCardSkeleton } from "./ModuleCardSkeleton";

// Modal-edit modules
export { ProjectTypeModule } from "./ProjectTypeModule";
export type { ProjectTypeModuleProps } from "./ProjectTypeModule";

export { DeadlineModule } from "./DeadlineModule";
export type { DeadlineModuleProps } from "./DeadlineModule";

export { TeamModule } from "./TeamModule";
export type { TeamModuleProps } from "./TeamModule";

export { SkillsModule } from "./SkillsModule";
export type { SkillsModuleProps, Skill } from "./SkillsModule";

// Navigate-to-config modules
export { DataSourcesModule } from "./DataSourcesModule";
export type { DataSourcesModuleProps, DataSource } from "./DataSourcesModule";

export { DataSchemasModule } from "./DataSchemasModule";
export type { DataSchemasModuleProps, Schema } from "./DataSchemasModule";

export { WorkflowModule } from "./WorkflowModule";
export type { WorkflowModuleProps } from "./WorkflowModule";
