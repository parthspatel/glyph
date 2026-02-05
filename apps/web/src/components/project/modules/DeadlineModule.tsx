/**
 * DeadlineModule - displays project deadline with countdown and provides modal editor.
 */

import * as React from "react";
import { Calendar } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DeadlineModuleProps {
  projectId: string;
  deadline: string | null; // ISO date string
  deadlineAction?: "notify" | "pause" | "escalate";
  onUpdate: (deadline: string | null, action?: string) => Promise<void>;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCountdown(dateString: string): {
  text: string;
  isOverdue: boolean;
} {
  const deadline = new Date(dateString);
  const now = new Date();

  // Reset times to compare just dates
  deadline.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true };
  }
  if (diffDays === 0) {
    return { text: "Due today", isOverdue: false };
  }
  if (diffDays === 1) {
    return { text: "1 day left", isOverdue: false };
  }
  return { text: `${diffDays} days left`, isOverdue: false };
}

export function DeadlineModule({
  projectId: _projectId,
  deadline,
  deadlineAction,
  onUpdate,
}: DeadlineModuleProps) {
  const [open, setOpen] = React.useState(false);
  const [dateValue, setDateValue] = React.useState("");
  const [actionValue, setActionValue] = React.useState<string>(
    deadlineAction || "notify",
  );
  const [isSaving, setIsSaving] = React.useState(false);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setDateValue(deadline ? deadline.split("T")[0] : "");
      setActionValue(deadlineAction || "notify");
    }
  }, [open, deadline, deadlineAction]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newDeadline = dateValue || null;
      await onUpdate(newDeadline, actionValue);
      setOpen(false);
    } catch (error) {
      console.error("Failed to update deadline:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onUpdate(null);
      setOpen(false);
    } catch (error) {
      console.error("Failed to clear deadline:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Determine status and preview
  let status: "configured" | "unconfigured" | "warning" = "unconfigured";
  let preview: React.ReactNode = null;

  if (deadline) {
    const countdown = formatCountdown(deadline);
    status = countdown.isOverdue ? "warning" : "configured";
    preview = (
      <span>
        {formatDate(deadline)} • {countdown.text}
      </span>
    );
  }

  return (
    <>
      <ModuleCard
        title="Deadline"
        icon={<Calendar />}
        status={status}
        preview={preview}
        emptyText="No deadline set"
        emptyAction="Set Deadline"
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Project Deadline</DialogTitle>
            <DialogDescription>
              Set a target completion date for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deadline-date">Deadline Date</Label>
              <Input
                id="deadline-date"
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline-action">When deadline passes</Label>
              <Select value={actionValue} onValueChange={setActionValue}>
                <SelectTrigger id="deadline-action">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notify">Send notification</SelectItem>
                  <SelectItem value="pause">Pause project</SelectItem>
                  <SelectItem value="escalate">Escalate to admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {deadline && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleClear}
              disabled={isSaving}
            >
              Clear deadline
            </Button>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
