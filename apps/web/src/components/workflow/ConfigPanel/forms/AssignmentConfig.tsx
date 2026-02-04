/**
 * AssignmentConfig - Form for configuring task assignment rules.
 * Includes assignment mode, required skills/roles, and load balancing.
 */
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StepSettings } from "../../types";

// =============================================================================
// Types
// =============================================================================

export interface AssignmentConfigProps {
  /** Current settings */
  settings: StepSettings;
  /** Called when settings change */
  onChange: (updates: Partial<StepSettings>) => void;
  /** Additional class names */
  className?: string;
}

interface SkillOption {
  id: string;
  name: string;
  description?: string;
}

interface RoleOption {
  id: string;
  name: string;
}

// =============================================================================
// Constants
// =============================================================================

const ASSIGNMENT_MODES = [
  {
    value: "auto",
    label: "Automatic",
    description: "System assigns tasks based on availability and skills",
  },
  {
    value: "manual",
    label: "Manual",
    description: "Project lead manually assigns tasks",
  },
  {
    value: "round_robin",
    label: "Round Robin",
    description: "Tasks assigned in rotation",
  },
  {
    value: "least_loaded",
    label: "Least Loaded",
    description: "Assign to annotator with fewest pending tasks",
  },
];

// =============================================================================
// Mock API (replace with real API when available)
// =============================================================================

async function fetchSkills(): Promise<SkillOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [
    { id: "medical_terminology", name: "Medical Terminology" },
    { id: "legal_review", name: "Legal Review" },
    { id: "image_annotation", name: "Image Annotation" },
    { id: "audio_transcription", name: "Audio Transcription" },
    { id: "sentiment_analysis", name: "Sentiment Analysis" },
    { id: "entity_recognition", name: "Entity Recognition" },
  ];
}

async function fetchRoles(): Promise<RoleOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { id: "annotator", name: "Annotator" },
    { id: "reviewer", name: "Reviewer" },
    { id: "adjudicator", name: "Adjudicator" },
    { id: "senior_annotator", name: "Senior Annotator" },
    { id: "domain_expert", name: "Domain Expert" },
  ];
}

// =============================================================================
// Multi-Select Component
// =============================================================================

interface MultiSelectProps {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const MultiSelect = memo(function MultiSelect({
  label,
  options,
  selected,
  onChange,
  isLoading,
  placeholder = "Select...",
}: MultiSelectProps) {
  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selected.map((id) => {
            const option = options.find((o) => o.id === id);
            return (
              <Badge
                key={id}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => toggleOption(id)}
              >
                {option?.name ?? id}
                <span className="ml-1 text-muted-foreground">×</span>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      <Select onValueChange={toggleOption}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              disabled={selected.includes(option.id)}
            >
              <div className="flex items-center gap-2">
                {selected.includes(option.id) && (
                  <span className="text-primary">✓</span>
                )}
                {option.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

// =============================================================================
// Component
// =============================================================================

export const AssignmentConfig = memo(function AssignmentConfig({
  settings,
  onChange,
  className,
}: AssignmentConfigProps) {
  // Fetch skills and roles
  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
    staleTime: 5 * 60 * 1000,
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    staleTime: 5 * 60 * 1000,
  });

  const assignmentMode = "auto"; // Default mode
  const requiredSkills = settings.required_skills ?? [];
  const requiredRoles = settings.required_roles ?? [];
  const minAnnotators = settings.min_annotators ?? 1;

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* Assignment Mode */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Assignment Mode</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>How tasks are distributed to annotators.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Select value={assignmentMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNMENT_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div className="flex flex-col">
                    <span>{mode.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {mode.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Minimum Annotators */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Minimum Annotators</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Number of annotators required to complete this step before
                  consensus is calculated.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Input
            type="number"
            min={1}
            max={10}
            value={minAnnotators}
            onChange={(e) =>
              onChange({ min_annotators: parseInt(e.target.value, 10) || 1 })
            }
            className="w-24"
          />
        </div>

        {/* Required Skills */}
        <MultiSelect
          label="Required Skills"
          options={skills}
          selected={requiredSkills}
          onChange={(selected) => onChange({ required_skills: selected })}
          isLoading={skillsLoading}
          placeholder="Add required skills..."
        />

        {/* Required Roles */}
        <MultiSelect
          label="Required Roles"
          options={roles}
          selected={requiredRoles}
          onChange={(selected) => onChange({ required_roles: selected })}
          isLoading={rolesLoading}
          placeholder="Add required roles..."
        />

        {/* Load Balancing */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="load-balancing">Load Balancing</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  When enabled, the system distributes tasks evenly across
                  available annotators.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch id="load-balancing" defaultChecked />
        </div>
      </div>
    </TooltipProvider>
  );
});
