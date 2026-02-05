/**
 * ModuleCard component for project overview module chips.
 * Displays configured, unconfigured, or warning states with consistent styling.
 */

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ModuleCardProps {
  title: string;
  icon: React.ReactNode;
  status: "configured" | "unconfigured" | "warning";
  preview: React.ReactNode;
  emptyText?: string;
  emptyAction?: string;
  onClick: () => void;
  isLoading?: boolean;
}

export function ModuleCard({
  title,
  icon,
  status,
  preview,
  emptyText,
  emptyAction,
  onClick,
  isLoading,
}: ModuleCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  if (isLoading) {
    return null; // Use ModuleCardSkeleton for loading states
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "p-4 cursor-pointer transition-all duration-150",
        "hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        status === "unconfigured" && "bg-muted/30 border-dashed",
        status === "warning" && "border-l-4 border-l-warning"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="size-5 text-muted-foreground flex items-center justify-center [&>svg]:size-5">
          {icon}
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
        {status === "warning" && (
          <AlertCircle className="size-4 text-warning ml-auto" />
        )}
      </div>

      {/* Content */}
      {status === "configured" ? (
        <div className="text-sm text-muted-foreground">{preview}</div>
      ) : (
        <div className="flex flex-col items-center justify-center py-2 text-center">
          <span className="size-8 text-muted-foreground/50 mb-2 flex items-center justify-center [&>svg]:size-8">
            {icon}
          </span>
          {emptyText && (
            <p className="text-sm text-muted-foreground mb-2">{emptyText}</p>
          )}
          {emptyAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              {emptyAction}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
