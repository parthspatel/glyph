/**
 * NodePalette - Sidebar with draggable node types.
 */
import { memo, useState, type DragEvent } from "react";
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
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NodeType } from "../types";

// =============================================================================
// Palette Item Configuration
// =============================================================================

interface PaletteItemConfig {
  type: NodeType;
  label: string;
  icon: typeof Pencil;
  color: string;
  description: string;
}

const paletteGroups: { title: string; items: PaletteItemConfig[] }[] = [
  {
    title: "Start/End",
    items: [
      {
        type: "start",
        label: "Start",
        icon: Play,
        color: "text-green-500",
        description: "Workflow entry point",
      },
      {
        type: "end",
        label: "End",
        icon: Square,
        color: "text-red-500",
        description: "Workflow terminal",
      },
    ],
  },
  {
    title: "Steps",
    items: [
      {
        type: "annotation",
        label: "Annotation",
        icon: Pencil,
        color: "text-blue-500",
        description: "Human annotation task",
      },
      {
        type: "review",
        label: "Review",
        icon: Eye,
        color: "text-green-500",
        description: "Review previous work",
      },
      {
        type: "adjudication",
        label: "Adjudication",
        icon: Scale,
        color: "text-orange-500",
        description: "Resolve disagreements",
      },
      {
        type: "auto_process",
        label: "Auto Process",
        icon: Cog,
        color: "text-indigo-500",
        description: "Automatic processing",
      },
    ],
  },
  {
    title: "Control Flow",
    items: [
      {
        type: "conditional",
        label: "Condition",
        icon: GitBranch,
        color: "text-pink-500",
        description: "Conditional branching",
      },
      {
        type: "fork",
        label: "Fork",
        icon: GitFork,
        color: "text-teal-500",
        description: "Parallel split",
      },
      {
        type: "join",
        label: "Join",
        icon: GitMerge,
        color: "text-teal-500",
        description: "Parallel merge",
      },
      {
        type: "sub_workflow",
        label: "Sub-Workflow",
        icon: Layers,
        color: "text-slate-500",
        description: "Embedded workflow",
      },
    ],
  },
];

// =============================================================================
// Palette Item Component
// =============================================================================

interface PaletteItemProps {
  item: PaletteItemConfig;
}

const PaletteItem = memo(function PaletteItem({ item }: PaletteItemProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("application/reactflow-type", item.type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-grab active:cursor-grabbing",
        "border border-transparent hover:border-border",
        "bg-card hover:bg-accent transition-colors"
      )}
    >
      <div className={cn("p-2 rounded-md bg-muted", item.color)}>
        <item.icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {item.description}
        </p>
      </div>
    </div>
  );
});

// =============================================================================
// NodePalette Component
// =============================================================================

export interface NodePaletteProps {
  className?: string;
}

export const NodePalette = memo(function NodePalette({
  className,
}: NodePaletteProps) {
  const [search, setSearch] = useState("");

  // Filter items based on search
  const filteredGroups = paletteGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div
      className={cn(
        "w-64 border-r bg-background flex flex-col h-full",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold mb-3">Node Palette</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.items.map((item) => (
                <PaletteItem key={item.type} item={item} />
              ))}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No nodes match your search
          </p>
        )}
      </div>

      {/* Help text */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground">
          Drag nodes onto the canvas to add them to your workflow.
        </p>
      </div>
    </div>
  );
});
