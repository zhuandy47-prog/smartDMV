"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEdit } from "@/components/ui/inline-edit";
import { toast } from "sonner";

export function CommentSection({ postId }: { postId: Id<"documents"> }) {
  const comments = useQuery(api.comments.getCommentsByPost, { postId });
  const createComment = useMutation(api.comments.createComment);

  // The InlineEdit's `value` prop stays empty — its internal "draft" state
  // tracks whatever the user is typing. After a successful save, the prop
  // is still "", so the component clears itself back to the placeholder.
  async function handlePost(text: string) {
    try {
      await createComment({ postId, body: text });
    } catch {
      toast.error("Failed to post comment.");
      // Re-throw so InlineEdit reverts and the user can retry.
      throw new Error("Failed to post comment.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment list — plain text */}
        {comments === undefined && (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        )}
        {comments && comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
        {comments && comments.length > 0 && (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li
                key={comment._id}
                className="border rounded p-3 text-sm bg-muted/20"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment._creationTime).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}

        {/* New comment input — animated inline-edit pill.
            Click the pen → type → Enter or click the green check to post. */}
        <div className="pt-2 border-t">
          <InlineEdit
            value=""
            onSave={handlePost}
            placeholder="Add a comment..."
            ariaLabel="Add a comment"
          />
        </div>
      </CardContent>
    </Card>
  );
}
