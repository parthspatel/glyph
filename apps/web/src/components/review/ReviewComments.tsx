/**
 * ReviewComments - Display inline review comments.
 *
 * Shows comments attached to specific fields/paths in an annotation.
 * This is a placeholder for future inline commenting functionality.
 */

import React from "react";
import { MessageSquare } from "lucide-react";
import type { ReviewComment } from "@glyph/types";

interface ReviewCommentsProps {
  /** List of review comments */
  comments: ReviewComment[];
}

export function ReviewComments({
  comments,
}: ReviewCommentsProps): React.ReactElement | null {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        <span>Review Comments ({comments.length})</span>
      </div>
      <div className="flex flex-col gap-3">
        {comments.map((comment) => (
          <div
            key={comment.comment_id}
            className="rounded-md border border-border/50 bg-muted/30 p-3"
          >
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Field: <code className="rounded bg-muted px-1">{comment.path}</code>
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
