/**
 * Presence indicator showing active users on a project.
 * Displays avatar stack with tooltips for user names.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueueStore } from "@/stores/queueStore";

interface PresenceIndicatorProps {
  projectId: string;
  maxVisible?: number;
}

export function PresenceIndicator({
  projectId,
  maxVisible = 5,
}: PresenceIndicatorProps) {
  const presence = useQueueStore(
    (s) => s.presenceByProject[projectId] ?? [],
  );

  if (presence.length === 0) return null;

  const visibleUsers = presence.slice(0, maxVisible);
  const overflowCount = presence.length - maxVisible;

  return (
    <div className="flex -space-x-2">
      {visibleUsers.map((user) => (
        <Tooltip key={user.user_id}>
          <TooltipTrigger asChild>
            <Avatar className="h-6 w-6 border-2 border-background cursor-default">
              {user.avatar_url && <AvatarImage src={user.avatar_url} />}
              <AvatarFallback className="text-xs">
                {user.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{user.display_name}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {overflowCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground cursor-default">
              +{overflowCount}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{overflowCount} more active</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
