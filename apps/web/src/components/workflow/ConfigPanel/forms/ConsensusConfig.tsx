/**
 * ConsensusConfig - Form for configuring consensus settings.
 * Includes agreement metric, threshold, and action settings.
 */
import { memo } from "react";
import { Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AgreementMetric, StepSettings } from "../../types";

// =============================================================================
// Types
// =============================================================================

export interface ConsensusConfigProps {
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

const AGREEMENT_METRICS: {
  value: AgreementMetric;
  label: string;
  description: string;
}[] = [
  {
    value: "exact_match",
    label: "Exact Match",
    description: "Simple percentage of identical annotations",
  },
  {
    value: "cohen_kappa",
    label: "Cohen's Kappa",
    description: "Agreement accounting for chance (2 annotators)",
  },
  {
    value: "fleiss_kappa",
    label: "Fleiss' Kappa",
    description: "Multi-rater agreement accounting for chance",
  },
  {
    value: "jaccard",
    label: "Jaccard / IoU",
    description: "Intersection over Union for spans/boxes",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Use a custom agreement function",
  },
];

const ON_AGREEMENT_ACTIONS = [
  { value: "auto_complete", label: "Auto-complete step" },
  { value: "send_to_review", label: "Send to review" },
  { value: "next_step", label: "Proceed to next step" },
];

const ON_DISAGREEMENT_ACTIONS = [
  { value: "send_to_adjudication", label: "Send to adjudication" },
  { value: "send_to_review", label: "Send to review" },
  { value: "add_annotator", label: "Add another annotator" },
];

// =============================================================================
// Helpers
// =============================================================================

function getThresholdInterpretation(threshold: number): string {
  if (threshold >= 0.9) return "Almost perfect agreement";
  if (threshold >= 0.8) return "Strong agreement";
  if (threshold >= 0.6) return "Moderate agreement";
  if (threshold >= 0.4) return "Fair agreement";
  if (threshold >= 0.2) return "Slight agreement";
  return "Poor agreement";
}

// =============================================================================
// Component
// =============================================================================

export const ConsensusConfig = memo(function ConsensusConfig({
  settings,
  onChange,
  className,
}: ConsensusConfigProps) {
  const threshold = settings.threshold ?? 0.8;
  const metric = settings.agreement_metric ?? "exact_match";

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* Agreement Metric */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Agreement Metric</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  The statistical measure used to calculate agreement between
                  annotators. Choose based on your annotation type and number of
                  annotators.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Select
            value={metric}
            onValueChange={(v) =>
              onChange({ agreement_metric: v as AgreementMetric })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGREEMENT_METRICS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <div className="flex flex-col">
                    <span>{m.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Agreement Threshold</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Minimum agreement score required to consider annotations as
                    matching. Higher values require more precise agreement.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm font-medium">{threshold.toFixed(2)}</span>
          </div>

          <Slider
            value={[threshold]}
            onValueChange={([v]) => onChange({ threshold: v })}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />

          <p className="text-xs text-muted-foreground">
            {getThresholdInterpretation(threshold)}
          </p>
        </div>

        {/* On Agreement Action */}
        <div className="space-y-2">
          <Label>On Agreement</Label>
          <Select
            value={settings.visibility ?? "auto_complete"}
            onValueChange={(v) =>
              onChange({ visibility: v as StepSettings["visibility"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select action..." />
            </SelectTrigger>
            <SelectContent>
              {ON_AGREEMENT_ACTIONS.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* On Disagreement Action */}
        <div className="space-y-2">
          <Label>On Disagreement</Label>
          <Select defaultValue="send_to_adjudication">
            <SelectTrigger>
              <SelectValue placeholder="Select action..." />
            </SelectTrigger>
            <SelectContent>
              {ON_DISAGREEMENT_ACTIONS.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Show Previous Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="show-previous">Show Previous Annotations</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  When enabled, annotators can see annotations from previous
                  steps. Disable for blind annotation.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <input
            id="show-previous"
            type="checkbox"
            checked={settings.show_previous ?? false}
            onChange={(e) => onChange({ show_previous: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
        </div>
      </div>
    </TooltipProvider>
  );
});
