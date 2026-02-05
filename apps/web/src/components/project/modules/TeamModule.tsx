/**
 * TeamModule - displays assigned team and provides modal selection.
 */

import * as React from "react";
import { Users, Check } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { useTeams } from "@/hooks/useTeams";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface TeamModuleProps {
  projectId: string;
  teamId: string | null;
  teamName?: string;
  memberCount?: number;
  onUpdate: (teamId: string | null) => Promise<void>;
}

export function TeamModule({
  projectId: _projectId,
  teamId,
  teamName,
  memberCount,
  onUpdate,
}: TeamModuleProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(teamId);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const { data: teamsResponse, isLoading: teamsLoading } = useTeams({
    limit: 50,
  });
  const teams = teamsResponse?.items ?? [];

  // Filter teams by search
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Find selected team for preview
  const selectedTeam = teams.find((t) => t.team_id === selectedId);

  // Reset selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedId(teamId);
      setSearchQuery("");
    }
  }, [open, teamId]);

  const handleSave = async () => {
    if (selectedId === teamId) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(selectedId);
      setOpen(false);
    } catch (error) {
      console.error("Failed to update team assignment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Build preview content
  let preview: React.ReactNode = null;
  if (teamId && teamName) {
    preview = (
      <span>
        {teamName}
        {typeof memberCount === "number" && ` • ${memberCount} members`}
      </span>
    );
  } else if (teamId && selectedTeam) {
    preview = (
      <span>
        {selectedTeam.name} • {selectedTeam.member_count} members
      </span>
    );
  }

  return (
    <>
      <ModuleCard
        title="Assigned Team"
        icon={<Users />}
        status={teamId ? "configured" : "unconfigured"}
        preview={preview}
        emptyText="No team assigned"
        emptyAction="Assign Team"
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Team</DialogTitle>
          </DialogHeader>

          {teams.length > 5 && (
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto py-2">
            {teamsLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : filteredTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery
                  ? "No teams match your search."
                  : "No teams available."}
              </p>
            ) : (
              filteredTeams.map((team) => {
                const isSelected = selectedId === team.team_id;
                return (
                  <button
                    key={team.team_id}
                    type="button"
                    onClick={() => setSelectedId(team.team_id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {team.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {team.member_count} members
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="size-5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {teamId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setSelectedId(null)}
            >
              Clear assignment
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
