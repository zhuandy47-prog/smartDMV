import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDocumentAccess } from "./auth_helpers";

export const getCommentsByPost = query({
  args: { postId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.postId);
    if (!doc) return [];
    await requireDocumentAccess(ctx, doc.userId);

    return await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(200);
  },
});

export const createComment = mutation({
  args: {
    body: v.string(),
    postId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    if (args.body.trim().length === 0) {
      throw new ConvexError("Comment cannot be empty.");
    }

    const doc = await ctx.db.get(args.postId);
    if (!doc) throw new ConvexError("Document not found.");
    const user = await requireDocumentAccess(ctx, doc.userId);

    return await ctx.db.insert("comments", {
      postId: args.postId,
      body: args.body.trim(),
      authorId: user._id,
      authorName: user.name ?? "User",
    });
  },
});

