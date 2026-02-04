/**
 * ActivationSuccess - Success modal shown after project activation.
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Users,
  BarChart3,
  Settings,
  ArrowRight,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface ActivationSuccessProps {
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToDashboard: () => void;
  onStayHere: () => void;
}

// =============================================================================
// Next Steps
// =============================================================================

const nextSteps = [
  {
    icon: Users,
    title: "Invite annotators to your team",
    description: "Add team members who will work on this project",
  },
  {
    icon: BarChart3,
    title: "Monitor progress on dashboard",
    description: "Track completion rates and quality metrics",
  },
  {
    icon: Settings,
    title: "Configure quality settings",
    description: "Set up consensus and adjudication rules",
  },
];

// =============================================================================
// Component
// =============================================================================

export function ActivationSuccess({
  projectName,
  open,
  onOpenChange,
  onGoToDashboard,
  onStayHere,
}: ActivationSuccessProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl">Project Activated!</DialogTitle>
          <DialogDescription>
            <strong>{projectName}</strong> is now active and ready for annotations.
          </DialogDescription>
        </DialogHeader>

        {/* Next steps */}
        <div className="space-y-3 py-4">
          <h4 className="text-sm font-medium text-muted-foreground">Next Steps</h4>
          <div className="space-y-3">
            {nextSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <step.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onStayHere} className="w-full sm:w-auto">
            Stay Here
          </Button>
          <Button onClick={onGoToDashboard} className="w-full sm:w-auto">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
