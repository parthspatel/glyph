import { Button } from "@/components/ui/button";

interface BulkActionsProps {
  selectedCount: number;
  onActivate: () => void;
  onDeactivate: () => void;
  isLoading: boolean;
}

export function BulkActions({
  selectedCount,
  onActivate,
  onDeactivate,
  isLoading,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
      <span className="text-sm font-medium text-foreground">
        {selectedCount} user{selectedCount > 1 ? "s" : ""} selected
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onActivate}
          disabled={isLoading}
          className="border-success/50 text-success hover:bg-success/10"
        >
          {isLoading ? "Updating..." : "Activate"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onDeactivate}
          disabled={isLoading}
        >
          {isLoading ? "Updating..." : "Deactivate"}
        </Button>
      </div>
    </div>
  );
}
