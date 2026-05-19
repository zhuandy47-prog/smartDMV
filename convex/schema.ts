import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // A "documents" table — uploaded files awaiting / undergoing staff review
  documents: defineTable({
    fileName: v.string(),
    fileType: v.string(),
    storageId: v.string(),
    uploadedAt: v.number(),

    // Which submission slot the user picked it from. Optional because rows
    // created before this field existed don't have one — the UI shows
    // "Other" / "—" in that case.
    documentType: v.optional(
      v.union(
        v.literal("bank_statement"),
        v.literal("lease_agreement"),
        v.literal("utility_bill"),
      ),
    ),

    // Who uploaded the file (Better Auth user id)
    userId: v.optional(v.string()),

    // Staff review state
    reviewStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),

    // Timestamp of the last time the owner opened the comments thread on
    // this document. Used to compute the unread-comment notification badge
    // on /my-documents.
    ownerLastSeenCommentsAt: v.optional(v.number()),

    // Timestamp of the last time ANY staff member opened the comments
    // thread on this document. Shared across all staff for now (any staff
    // visiting clears the badge for everyone) — upgrade to per-staff later
    // if multiple staff members start stepping on each other's queues.
    staffLastSeenCommentsAt: v.optional(v.number()),

    // AI result (filled in after analysis)
    analyzed: v.boolean(),
    score: v.optional(v.number()),
    status: v.optional(v.string()), // AI status: "pass" | "warn" | "reject"
    summary: v.optional(v.string()),
    issues: v.optional(v.array(v.string())),
  })
    .index("by_user", ["userId"])
    .index("by_review_status", ["reviewStatus"]),

  comments: defineTable({
    postId: v.id("documents"),
    authorId: v.string(),
    authorName: v.string(),
    body: v.string(),
  }).index("by_post", ["postId"]),

  // Audit trail of staff actions on documents.
  // - action:
  //     "approved"  → reviewStatus set to "approved"
  //     "rejected"  → reviewStatus set to "rejected"
  //     "reopened"  → reviewStatus reverted to "pending" by staff
  // - reason: set on rejections (mirrored from the rejection comment) and on
  //   any post-decision change (changing a previous decision always requires
  //   a reason so the audit trail explains why).
  // _creationTime is the timestamp.
  auditLog: defineTable({
    documentId: v.id("documents"),
    actorId: v.string(),
    actorName: v.string(),
    action: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("reopened"),
    ),
    reason: v.optional(v.string()),
  })
    .index("by_document", ["documentId"])
    .index("by_actor", ["actorId"]),

  // Role assignment, keyed by Better Auth user id.
  // Absence of a record is treated as role "user".
  // email/name are denormalised copies of the auth user — kept here so the
  // staff admin UI can show identity without cross-component lookups.
  //
  // `userSinceAt` is the timestamp from which the 60-day account-deletion
  // clock counts. It's set when a user becomes a regular `"user"` —
  // either at signup, or when staff demotes them. While someone is staff
  // the field is ignored. If absent (legacy records created before this
  // field), we fall back to the better-auth user's `createdAt`.
  userRoles: defineTable({
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("staff")),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    userSinceAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
});
