import { mutation, query, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  requireUser,
  requireStaff,
  requireDocumentAccess,
  getUserRole,
} from "./auth_helpers";
import { authComponent } from "./auth";

// ---------- Queries ----------

// Per-doc cap when counting unread comments. The navbar pills cap at "9+",
// so a tighter bound keeps each subscription cheap. 50 fresh comments on
// one thread is already well past anything a UI badge needs to differentiate.
const UNREAD_CAP_PER_DOC = 50;

// Reads only comments on `postId` that are newer than `seenAt`. Uses the
// `by_post` index — Convex auto-appends `_creationTime` as the index's
// tiebreaker column, so a compound `eq("postId", ...).gt("_creationTime", ...)`
// hits the index directly instead of fetching the doc's whole thread and
// filtering in JS.
async function freshCommentsOn(
  ctx: QueryCtx,
  postId: Id<"documents">,
  seenAt: number,
): Promise<Doc<"comments">[]> {
  return ctx.db
    .query("comments")
    .withIndex("by_post", (q) =>
      q.eq("postId", postId).gt("_creationTime", seenAt),
    )
    .take(UNREAD_CAP_PER_DOC);
}

// Staff dashboard: paginated list of documents, OLDEST first.
// The dashboard is a review queue — staff should see the longest-waiting
// submissions at the top so nothing slips through.
//
// Optional reviewStatus filter uses the `by_review_status` index.
//
// Use with `usePaginatedQuery(api.documents.listAll, { reviewStatus }, ...)`
// on the client — Convex provides Load More / cursors automatically.
export const listAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
    reviewStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);

    const page = args.reviewStatus
      ? await ctx.db
          .query("documents")
          .withIndex("by_review_status", (q) =>
            q.eq("reviewStatus", args.reviewStatus!),
          )
          .order("asc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("documents")
          .order("asc")
          .paginate(args.paginationOpts);

    // Per-doc unread badge (staff perspective): count comments authored
    // by the doc owner that are newer than the staff-seen timestamp.
    const enriched = await Promise.all(
      page.page.map(async (doc) => {
        const seenAt = doc.staffLastSeenCommentsAt ?? 0;
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_post", (q) => q.eq("postId", doc._id))
          .take(200);
        const unreadCount = comments.filter(
          (c) =>
            c._creationTime > seenAt &&
            doc.userId !== undefined &&
            c.authorId === doc.userId,
        ).length;
        return { ...doc, unreadCount };
      }),
    );

    return { ...page, page: enriched };
  },
});

// User-facing: list the current user's own uploads, newest first.
// Each row carries an `unreadCount` so the UI can render a red pill on
// docs where staff (or the AI auto-rejection) has new comments.
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    return await Promise.all(
      docs.map(async (doc) => {
        const seenAt = doc.ownerLastSeenCommentsAt ?? 0;
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_post", (q) => q.eq("postId", doc._id))
          .take(200);
        // "Unread" for the owner = anything they didn't author themselves
        // (staff replies + the system auto-rejection notice).
        const unreadCount = comments.filter(
          (c) => c._creationTime > seenAt && c.authorId !== user._id,
        ).length;
        return { ...doc, unreadCount };
      }),
    );
  },
});

// Number of comments on the user's docs that:
//   - were authored by someone other than the user (i.e. staff), AND
//   - were created after the user last viewed that doc's comments thread.
// Used to render the navbar badge.
//
// Returns 0 when not signed in (no error) so the navbar can call it
// unconditionally.
export const unreadCommentCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return 0;

    const myDocs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(100);

    // Per-doc reads run concurrently in one transaction. Each call hits
    // only NEW comments (creationTime > the doc's seenAt) instead of the
    // doc's entire thread, so total reads scale with unread count rather
    // than total comment count.
    const counts = await Promise.all(
      myDocs.map(async (doc) => {
        const seenAt = doc.ownerLastSeenCommentsAt ?? 0;
        const fresh = await freshCommentsOn(ctx, doc._id, seenAt);
        return fresh.filter((c) => c.authorId !== user._id).length;
      }),
    );
    return counts.reduce((a, b) => a + b, 0);
  },
});

// Marks a doc's comments as seen by its owner (idempotent). Called from the
// /my-documents/[id] page on mount.
export const markCommentsSeen = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return;
    // Only the owner has an "unread" concept; staff already see everything
    // in the dashboard.
    if (doc.userId !== user._id) return;
    await ctx.db.patch(args.documentId, {
      ownerLastSeenCommentsAt: Date.now(),
    });
  },
});

// Number of comments authored by document owners (i.e. user replies) that
// no staff member has viewed yet. Drives the red badge next to the
// "Dashboard" link in the navbar.
//
// Returns 0 for non-staff so the navbar can call this unconditionally.
export const staffUnreadCommentCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return 0;
    const role = await getUserRole(ctx, user._id);
    if (role !== "staff") return 0;

    // Recent docs only — this is the navbar pill, not a full audit. 200
    // is plenty since older docs aren't actively driving unread counts.
    const docs = await ctx.db.query("documents").order("desc").take(200);

    const counts = await Promise.all(
      docs.map(async (doc) => {
        const seenAt = doc.staffLastSeenCommentsAt ?? 0;
        const fresh = await freshCommentsOn(ctx, doc._id, seenAt);
        // A "user reply" = comment authored by the doc's owner.
        // Excludes staff-authored comments and the "system" auto-rejection.
        return fresh.filter(
          (c) => doc.userId !== undefined && c.authorId === doc.userId,
        ).length;
      }),
    );
    return counts.reduce((a, b) => a + b, 0);
  },
});

// Same data as staffUnreadCommentCount, but broken out by reviewStatus
// so the dashboard tabs can each show their own pill.
//
// Returns zeros for non-staff so the dashboard can call this
// unconditionally.
export const staffUnreadByStatus = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ pending: number; approved: number; rejected: number }> => {
    const empty = { pending: 0, approved: 0, rejected: 0 };
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return empty;
    const role = await getUserRole(ctx, user._id);
    if (role !== "staff") return empty;

    const docs = await ctx.db.query("documents").order("desc").take(500);

    // Read fresh comments for every doc concurrently, then bucket by
    // reviewStatus. The compound `eq(postId).gt(_creationTime)` lookup
    // means we only fetch unread comments per doc, not its full thread.
    const docUnreadCounts = await Promise.all(
      docs.map(async (doc) => {
        const seenAt = doc.staffLastSeenCommentsAt ?? 0;
        const fresh = await freshCommentsOn(ctx, doc._id, seenAt);
        const docUnread = fresh.filter(
          (c) => doc.userId !== undefined && c.authorId === doc.userId,
        ).length;
        return { docUnread, status: doc.reviewStatus ?? "pending" };
      }),
    );

    const counts = { ...empty };
    for (const { docUnread, status } of docUnreadCounts) {
      if (docUnread === 0) continue;
      if (status === "pending") counts.pending += docUnread;
      else if (status === "approved") counts.approved += docUnread;
      else if (status === "rejected") counts.rejected += docUnread;
    }
    return counts;
  },
});

// Staff opens a doc detail → all user comments on it are now "seen".
// Idempotent. No-op if the caller isn't staff.
export const markCommentsSeenAsStaff = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return;
    const role = await getUserRole(ctx, user._id);
    if (role !== "staff") return;
    await ctx.db.patch(args.documentId, {
      staffLastSeenCommentsAt: Date.now(),
    });
  },
});

// Owner resubmits a previously-rejected document. Creates a new document
// row reusing the original's fileName so it stays grouped/recognisable in
// the list. The new row starts again at reviewStatus="pending".
export const resubmit = mutation({
  args: {
    originalDocumentId: v.id("documents"),
    fileType: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const original = await ctx.db.get(args.originalDocumentId);
    if (!original) {
      throw new ConvexError("Original document not found.");
    }
    if (original.userId !== user._id) {
      throw new ConvexError("You can only resubmit your own documents.");
    }
    if (original.reviewStatus !== "rejected") {
      throw new ConvexError(
        "Only rejected documents can be resubmitted.",
      );
    }
    return await ctx.db.insert("documents", {
      fileName: original.fileName,
      fileType: args.fileType,
      storageId: args.storageId,
      documentType: original.documentType,
      userId: user._id,
      uploadedAt: Date.now(),
      analyzed: false,
      reviewStatus: "pending",
    });
  },
});

// Get a single document by ID. Visible to the uploader OR staff.
export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    await requireDocumentAccess(ctx, doc.userId);
    return doc;
  },
});

// Signed URL for a stored file. Same access rule as getById.
export const getFileUrl = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;
    await requireDocumentAccess(ctx, doc.userId);
    return ctx.storage.getUrl(doc.storageId);
  },
});

// ---------- Mutations ----------

const documentTypeValidator = v.union(
  v.literal("bank_statement"),
  v.literal("lease_agreement"),
  v.literal("utility_bill"),
);

export const save = mutation({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    storageId: v.string(),
    documentType: documentTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db.insert("documents", {
      ...args,
      userId: user._id,
      uploadedAt: Date.now(),
      analyzed: false,
      reviewStatus: "pending",
    });
  },
});

// Documents scoring strictly below this get auto-rejected by the AI itself.
// Tweak to make rejection more or less aggressive.
const AUTO_REJECT_THRESHOLD = 50;

// Documents scoring at-or-above this AND flagged status="pass" by the AI
// get auto-approved without staff review. Set deliberately above the
// rubric's "pass" floor (85) — leaves a 5-point cushion so borderline
// passes (85-89) still get a human sanity check, and only obviously
// clean docs short-circuit straight to approved.
const AUTO_APPROVE_THRESHOLD = 90;

// Sentinel actor id used in auditLog and comments rows the system
// writes on its own. Never matches any user._id, so unread-count
// queries treat it correctly as "not me".
const SYSTEM_ACTOR_ID = "system";
const SYSTEM_ACTOR_NAME = "Automated Verification";

export const saveAiResult = mutation({
  args: {
    id: v.id("documents"),
    score: v.number(),
    status: v.string(),
    summary: v.string(),
    issues: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // The uploader (or staff) can save the AI result for their document.
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError("Document not found.");
    await requireDocumentAccess(ctx, doc.userId);

    const { id, ...rest } = args;
    const shouldAutoReject = args.score < AUTO_REJECT_THRESHOLD;
    // Both signals must agree before we skip staff review. The score and
    // the status are independent outputs from the model — usually they
    // line up (90+ = "pass") but we belt-and-suspenders the gate so a
    // weird "score: 92, status: warn" response can't sneak through to
    // approved without a human looking at it.
    const shouldAutoApprove =
      !shouldAutoReject &&
      args.status === "pass" &&
      args.score >= AUTO_APPROVE_THRESHOLD;

    await ctx.db.patch(id, {
      ...rest,
      analyzed: true,
      ...(shouldAutoReject
        ? { reviewStatus: "rejected" as const }
        : shouldAutoApprove
          ? { reviewStatus: "approved" as const }
          : {}),
    });

    // Post a system comment so the user sees exactly why their doc was
    // auto-rejected and what to fix on resubmission.
    if (shouldAutoReject) {
      const issuesBlock =
        args.issues.length > 0
          ? `\n\nIssues detected:\n${args.issues.map((i) => `• ${i}`).join("\n")}`
          : "";
      const body =
        `Auto-rejected by automated verification ` +
        `(score: ${args.score}/100).\n\n` +
        `${args.summary}${issuesBlock}\n\n` +
        `Please address the issues above and resubmit.`;

      await ctx.db.insert("comments", {
        postId: id,
        authorId: SYSTEM_ACTOR_ID,
        authorName: SYSTEM_ACTOR_NAME,
        body: body.trim(),
      });
    }

    // Mirror the auto-reject path: write an auditLog entry (so the
    // staff audit page records the approval, just with "system" as the
    // actor), and post a friendly system comment so the user sees the
    // confirmation in-thread.
    if (shouldAutoApprove) {
      await ctx.db.insert("auditLog", {
        documentId: id,
        actorId: SYSTEM_ACTOR_ID,
        actorName: SYSTEM_ACTOR_NAME,
        action: "approved",
      });

      const notesBlock =
        args.issues.length > 0
          ? `\n\nMinor notes (none blocking):\n${args.issues.map((i) => `• ${i}`).join("\n")}`
          : "";
      const body =
        `Auto-approved by automated verification ` +
        `(score: ${args.score}/100).\n\n` +
        `${args.summary}${notesBlock}`;

      await ctx.db.insert("comments", {
        postId: id,
        authorId: SYSTEM_ACTOR_ID,
        authorName: SYSTEM_ACTOR_NAME,
        body: body.trim(),
      });
    }

    return {
      autoRejected: shouldAutoReject,
      autoApproved: shouldAutoApprove,
      score: args.score,
    };
  },
});

// Staff: approve a document. Atomically writes an audit log entry.
export const approve = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);
    await ctx.db.patch(args.id, { reviewStatus: "approved" });
    await ctx.db.insert("auditLog", {
      documentId: args.id,
      actorId: user._id,
      actorName: user.name ?? "Staff",
      action: "approved",
    });
  },
});

// Staff: reject a document with a required reason. Atomically:
//   1) inserts the reason as a comment,
//   2) flips reviewStatus to "rejected",
//   3) writes an audit log entry that includes the reason for the trail.
export const rejectWithReason = mutation({
  args: {
    id: v.id("documents"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx);

    if (args.reason.trim().length === 0) {
      throw new ConvexError("A rejection reason is required.");
    }
    const reason = args.reason.trim();

    await ctx.db.insert("comments", {
      postId: args.id,
      authorId: user._id,
      authorName: user.name ?? "Staff",
      body: reason,
    });

    await ctx.db.patch(args.id, { reviewStatus: "rejected" });

    await ctx.db.insert("auditLog", {
      documentId: args.id,
      actorId: user._id,
      actorName: user.name ?? "Staff",
      action: "rejected",
      reason,
    });
  },
});

// ---------- Audit log queries ----------

// Per-document audit history (compact — usually 1-3 entries). Staff only.
export const listAuditByDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    return await ctx.db
      .query("auditLog")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .order("desc")
      .take(50);
  },
});

// Global audit feed for the /dashboard/audit page. Paginated. Staff only.
// Each entry is enriched with the document's current fileName so the page
// can render a useful row without a second round-trip per entry.
export const listAuditAll = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const page = await ctx.db
      .query("auditLog")
      .order("desc")
      .paginate(args.paginationOpts);

    // Hydrate each entry with the document's current fileName.
    const enriched = await Promise.all(
      page.page.map(async (entry) => {
        const doc = await ctx.db.get(entry.documentId);
        return {
          ...entry,
          documentFileName: doc?.fileName ?? "(deleted)",
        };
      }),
    );

    return { ...page, page: enriched };
  },
});

export const GenerateDocumentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
