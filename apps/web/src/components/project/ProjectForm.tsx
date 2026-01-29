/**
 * Main project creation/edit form.
 * Uses collapsible accordion sections with a checklist sidebar.
 */

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Accordion from "@radix-ui/react-accordion";
import { z } from "zod";
import { useState, useEffect, useCallback } from "react";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { ProjectChecklist } from "./ProjectChecklist";
import {
  BasicInfoSection,
  ProjectTypeSection,
  SchemaSection,
  DataSourcesSection,
  SkillRequirementsSection,
} from "./sections";

// Form validation schema
const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().optional(),
  project_type_id: z.string().optional(),
  input_schema: z.record(z.unknown()).optional(),
  output_schema: z.record(z.unknown()).optional(),
  data_sources: z.array(z.unknown()).default([]),
  skill_requirements: z.array(z.unknown()).default([]),
  tags: z.array(z.string()).default([]),
  documentation: z.string().optional(),
  deadline: z.string().optional(),
  deadline_action: z.enum(["notify", "pause", "escalate", ""]).optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormData> & {
    project_id?: string;
    status?: string;
  };
  onSubmit: (data: ProjectFormData) => Promise<void>;
  isEdit?: boolean;
}

interface AccordionSectionProps {
  value: string;
  title: string;
  isComplete: boolean;
  hasError?: boolean;
  children: React.ReactNode;
}

function AccordionSection({
  value,
  title,
  isComplete,
  hasError,
  children,
}: AccordionSectionProps) {
  return (
    <Accordion.Item value={value} className="accordion-item">
      <Accordion.Header className="accordion-header">
        <Accordion.Trigger className="accordion-trigger">
          <div className="accordion-trigger-content">
            <span
              className={`accordion-status ${isComplete ? "complete" : hasError ? "error" : ""}`}
            >
              {isComplete ? "✓" : hasError ? "!" : "○"}
            </span>
            <span className="accordion-title">{title}</span>
          </div>
          <span className="accordion-chevron">▼</span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="accordion-content">
        <div className="accordion-content-inner">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

export function ProjectForm({
  defaultValues,
  onSubmit,
  isEdit = false,
}: ProjectFormProps) {
  const methods = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      data_sources: [],
      skill_requirements: [],
      tags: [],
      ...defaultValues,
    },
  });

  const {
    formState: { errors, isDirty, isSubmitting },
    watch,
    handleSubmit,
  } = methods;

  // Unsaved changes warning
  useUnsavedChanges({ isDirty });

  // Track section completion
  const name = watch("name");
  const projectTypeId = watch("project_type_id");
  const outputSchema = watch("output_schema");
  const dataSources = watch("data_sources") || [];
  const skillRequirements = watch("skill_requirements") || [];

  const sectionStatus = {
    basic: Boolean(name && name.trim().length > 0),
    projectType: Boolean(projectTypeId),
    schema: Boolean(outputSchema && Object.keys(outputSchema).length > 0),
    dataSources: dataSources.length > 0,
    skills: skillRequirements.length > 0,
  };

  // Accordion state
  const [openSections, setOpenSections] = useState<string[]>(["basic"]);

  // Auto-expand first incomplete section
  useEffect(() => {
    const sections = [
      "basic",
      "projectType",
      "schema",
      "dataSources",
      "skills",
    ] as const;
    const firstIncomplete = sections.find((s) => !sectionStatus[s]);

    if (firstIncomplete && openSections.length === 0) {
      setOpenSections([firstIncomplete]);
    }
  }, []);

  const handleSectionClick = useCallback((section: string) => {
    setOpenSections([section]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, onSubmit]);

  const projectId = defaultValues?.project_id;
  const isDraftStatus =
    !defaultValues?.status || defaultValues.status === "draft";

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="project-form">
        {/* Main form area */}
        <div className="project-form-main">
          <Accordion.Root
            type="multiple"
            value={openSections}
            onValueChange={setOpenSections}
            className="project-accordion"
          >
            <AccordionSection
              value="basic"
              title="Basic Information"
              isComplete={sectionStatus.basic}
              hasError={!!errors.name}
            >
              <BasicInfoSection />
            </AccordionSection>

            <AccordionSection
              value="projectType"
              title="Project Type"
              isComplete={sectionStatus.projectType}
            >
              <ProjectTypeSection disabled={isEdit && !isDraftStatus} />
            </AccordionSection>

            <AccordionSection
              value="schema"
              title="Schema Configuration"
              isComplete={sectionStatus.schema}
            >
              <SchemaSection />
            </AccordionSection>

            <AccordionSection
              value="dataSources"
              title="Data Sources"
              isComplete={sectionStatus.dataSources}
            >
              <DataSourcesSection projectId={projectId} />
            </AccordionSection>

            <AccordionSection
              value="skills"
              title="Skill Requirements"
              isComplete={sectionStatus.skills}
            >
              <SkillRequirementsSection />
            </AccordionSection>
          </Accordion.Root>

          {/* Form actions */}
          <div className="project-form-actions">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Project"}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <ProjectChecklist
          sectionStatus={sectionStatus}
          onSectionClick={handleSectionClick}
          projectId={projectId}
        />
      </form>
    </FormProvider>
  );
}
