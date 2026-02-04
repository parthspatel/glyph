/**
 * BaseNode - Shared structure for workflow nodes.
 * Provides consistent selection styling and validation badge.
 */
import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BaseNodeProps {
  /** Whether the node is selected */
  selected?: boolean;
  /** Whether the node has validation errors */
  hasError?: boolean;
  /** Child content */
  children: ReactNode;
  /** Additional class names */
  className?: string;
}

export const BaseNode = memo(function BaseNode({
  selected,
  hasError,
  children,
  className,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        "relative",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
    >
      {/* Validation error badge */}
      {hasError && (
        <div
          className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive border-2 border-background z-10"
          title="Configuration error"
        />
      )}
      {children}
    </div>
  );
});
