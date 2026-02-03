/**
 * Dialog for selecting a rejection reason when rejecting a task
 * Uses Radix Dialog which is available in the project
 */
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RejectReason } from "@/api/queue";

const REJECT_OPTIONS = [
  {
    value: "conflict_of_interest",
    label: "Conflict of Interest",
    description: "I have a personal or professional conflict",
  },
  {
    value: "unclear_instructions",
    label: "Unclear Instructions",
    description: "The task instructions are not clear enough",
  },
  {
    value: "missing_context",
    label: "Missing Context",
    description: "Important context or information is missing",
  },
  {
    value: "outside_expertise",
    label: "Outside My Expertise",
    description: "This task is outside my area of expertise",
  },
  {
    value: "schedule_conflict",
    label: "Schedule Conflict",
    description: "I cannot complete this in the required timeframe",
  },
  {
    value: "technical_issues",
    label: "Technical Issues",
    description: "Technical problems prevent me from working on this",
  },
  {
    value: "other",
    label: "Other",
    description: "Another reason (please specify)",
  },
] as const;

interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: RejectReason) => void;
  isLoading: boolean;
  taskTitle?: string;
}

export function RejectDialog({
  open,
  onClose,
  onConfirm,
  isLoading,
  taskTitle,
}: RejectDialogProps) {
  const [selected, setSelected] = useState<string>("");
  const [otherDetails, setOtherDetails] = useState("");

  const handleConfirm = () => {
    if (!selected) return;

    const reason: RejectReason =
      selected === "other"
        ? { type: "other", details: otherDetails || "No details provided" }
        : { type: selected as Exclude<RejectReason["type"], "other"> };

    onConfirm(reason);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelected("");
      setOtherDetails("");
      onClose();
    }
  };

  const isValid =
    selected && (selected !== "other" || otherDetails.trim().length > 0);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Reject Task
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {taskTitle
                ? `Please select a reason for rejecting "${taskTitle}".`
                : "Please select a reason for rejecting this task."}
            </Dialog.Description>
          </div>

          <div className="py-4 space-y-3">
            {REJECT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selected === opt.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="reject-reason"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-1 size-4 accent-primary"
                />
                <div className="flex-1">
                  <span className="font-medium">{opt.label}</span>
                  <p className="text-sm text-muted-foreground">
                    {opt.description}
                  </p>
                </div>
              </label>
            ))}

            {selected === "other" && (
              <div className="mt-4">
                <label htmlFor="other-details" className="text-sm font-medium">
                  Please provide details
                </label>
                <textarea
                  id="other-details"
                  placeholder="Please describe your reason for rejecting this task..."
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                  className="mt-2 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!isValid || isLoading}
            >
              {isLoading ? "Rejecting..." : "Reject Task"}
            </Button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
