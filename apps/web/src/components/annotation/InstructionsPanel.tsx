/**
 * InstructionsPanel - Expandable panel for task instructions.
 *
 * Shows task-specific guidance for annotators.
 */

import React from "react";
import { useCollapse } from "react-collapsed";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

interface InstructionsPanelProps {
  /** HTML or plain text instructions */
  instructions?: string;
  /** Whether the panel is expanded */
  isExpanded: boolean;
  /** Toggle expand/collapse */
  onToggle: () => void;
}

export function InstructionsPanel({
  instructions,
  isExpanded,
  onToggle,
}: InstructionsPanelProps): React.ReactElement | null {
  const { getCollapseProps, getToggleProps } = useCollapse({
    isExpanded,
  });

  // Don't render if no instructions
  if (!instructions) {
    return null;
  }

  return (
    <div className="border-b border-border bg-muted/30">
      {/* Header - clickable toggle */}
      <button
        {...getToggleProps({ onClick: onToggle })}
        className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Instructions</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsible content */}
      <div {...getCollapseProps()}>
        <div className="px-4 pb-4">
          <div
            className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: instructions }}
          />
        </div>
      </div>
    </div>
  );
}
