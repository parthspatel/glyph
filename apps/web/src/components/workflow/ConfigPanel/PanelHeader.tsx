/**
 * PanelHeader - Header for the step configuration panel.
 */
import { memo, useState } from "react";
import {
  Pencil,
  Eye,
  Scale,
  Cog,
  GitBranch,
  GitFork,
  GitMerge,
  Layers,
  Play,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { WorkflowNode, NodeType } from "../types";

// =============================================================================
// Icon mapping
// =============================================================================

const nodeIcons: Record<NodeType, typeof Pencil> = {
  start: Play,
  end: Square,
  annotation: Pencil,
  review: Eye,
  adjudication: Scale,
  auto_process: Cog,
  conditional: GitBranch,
  fork: GitFork,
  join: GitMerge,
  sub_workflow: Layers,
};

const nodeColors: Record<NodeType, string> = {
  start: "text-green-500",
  end: "text-red-500",
  annotation: "text-blue-500",
  review: "text-green-500",
  adjudication: "text-orange-500",
  auto_process: "text-indigo-500",
  conditional: "text-pink-500",
  fork: "text-teal-500",
  join: "text-teal-500",
  sub_workflow: "text-slate-500",
};

// =============================================================================
// Component
// =============================================================================

export interface PanelHeaderProps {
  node: WorkflowNode;
  onNameChange: (name: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const PanelHeader = memo(function PanelHeader({
  node,
  onNameChange,
  onDelete,
  onClose,
}: PanelHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.data.label);

  const Icon = nodeIcons[node.data.nodeType] || Cog;
  const iconColor = nodeColors[node.data.nodeType] || "text-muted-foreground";

  const handleEditStart = () => {
    setEditValue(node.data.label);
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (editValue.trim()) {
      onNameChange(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEditSave();
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 border-b">
      {/* Icon */}
      <div className={cn("p-2 rounded-md bg-muted", iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Name (editable) */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-8"
          />
        ) : (
          <button
            onClick={handleEditStart}
            className="text-left w-full group"
          >
            <h2 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
              {node.data.label}
            </h2>
            <p className="text-sm text-muted-foreground capitalize">
              {node.data.nodeType.replace("_", " ")}
            </p>
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Delete button with confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Step</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{node.data.label}"? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Close button */}
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
