/**
 * CompletionCriteria - Form for configuring step completion criteria.
 * Includes annotation count, unique annotators, timeout, and auto-complete.
 */
import { memo } from "react";
import { Info, Clock, Users, FileCheck, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StepSettings } from "../../types";

// =============================================================================
// Types
// =============================================================================

export interface CompletionCriteriaProps {
  /** Current settings */
  settings: StepSettings;
  /** Called when settings change */
  onChange: (updates: Partial<StepSettings>) => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIMEOUT_UNITS = [
  { value: "minutes", label: "Minutes", multiplier: 1 },
  { value: "hours", label: "Hours", multiplier: 60 },
  { value: "days", label: "Days", multiplier: 1440 },
];

// =============================================================================
// Component
// =============================================================================

export const CompletionCriteria = memo(function CompletionCriteria({
  settings,
  onChange,
  className,
}: CompletionCriteriaProps) {
  const timeoutMinutes = settings.timeout_minutes ?? 120;
  const minAnnotators = settings.min_annotators ?? 1;

  // Parse timeout into value and unit
  const parseTimeout = (
    minutes: number
  ): { value: number; unit: string } => {
    if (minutes >= 1440 && minutes % 1440 === 0) {
      return { value: minutes / 1440, unit: "days" };
    }
    if (minutes >= 60 && minutes % 60 === 0) {
      return { value: minutes / 60, unit: "hours" };
    }
    return { value: minutes, unit: "minutes" };
  };

  const { value: timeoutValue, unit: timeoutUnit } = parseTimeout(timeoutMinutes);

  const handleTimeoutChange = (value: number, unit: string) => {
    const unitInfo = TIMEOUT_UNITS.find((u) => u.value === unit);
    const minutes = value * (unitInfo?.multiplier ?? 1);
    // Max timeout is 480 minutes (8 hours) per CONTEXT.md
    onChange({ timeout_minutes: Math.min(minutes, 480) });
  };

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* Annotation Count */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            <Label>Minimum Annotations</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  The minimum number of annotations required before this step
                  can be considered complete.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Input
            type="number"
            min={1}
            max={20}
            value={minAnnotators}
            onChange={(e) =>
              onChange({ min_annotators: parseInt(e.target.value, 10) || 1 })
            }
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            Step completes when this many annotations are submitted
          </p>
        </div>

        {/* Unique Annotators */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Label>Unique Annotators Required</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Require annotations from different annotators rather than
                  allowing the same person to submit multiple times.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="unique-annotators" defaultChecked />
            <Label htmlFor="unique-annotators" className="font-normal">
              Require unique annotators
            </Label>
          </div>
        </div>

        {/* Timeout */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label>Timeout</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Time limit for task completion. After timeout, task may be
                  reassigned or escalated. Maximum is 8 hours (480 minutes).
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={480}
              value={timeoutValue}
              onChange={(e) =>
                handleTimeoutChange(
                  parseInt(e.target.value, 10) || 1,
                  timeoutUnit
                )
              }
              className="w-24"
            />
            <Select
              value={timeoutUnit}
              onValueChange={(unit) => handleTimeoutChange(timeoutValue, unit)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEOUT_UNITS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Current: {timeoutMinutes} minutes total
          </p>
        </div>

        {/* Auto-Complete */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <Label>Auto-Complete</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Automatically advance to the next step when completion
                  criteria are met, without manual approval.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="auto-complete" defaultChecked />
            <Label htmlFor="auto-complete" className="font-normal">
              Auto-complete when criteria met
            </Label>
          </div>
        </div>

        {/* Timeout Action */}
        <div className="space-y-2">
          <Label>On Timeout</Label>
          <Select defaultValue="reassign">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reassign">Reassign to another annotator</SelectItem>
              <SelectItem value="escalate">Escalate to reviewer</SelectItem>
              <SelectItem value="skip">Skip this task</SelectItem>
              <SelectItem value="extend">Auto-extend timeout</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </TooltipProvider>
  );
});
