// Shared auth/role helpers used by queries and mutations.
//
// Absence of a userRoles record means role = "user". That way newly-signed-up
// users don't need to call claimRole; they're a regular user by default.

import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";

export type Role = "user" | "staff";

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new ConvexError("Not Authenticated!");
  }
  return user;
}

export async function getUserRole(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<Role> {
  const record = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return record?.role ?? "user";
}

export async function requireStaff(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  const role = await getUserRole(ctx, user._id);
  if (role !== "staff") {
    throw new ConvexError("Staff access required.");
  }
  return user;
}

// Allow access if the requester is the document's uploader OR a staff member.
// Used for getById / getFileUrl / comments — staff sees everything,
// regular users only see their own.
export async function requireDocumentAccess(
  ctx: QueryCtx | MutationCtx,
  documentUserId: string | undefined,
) {
  const user = await requireUser(ctx);
  if (documentUserId && documentUserId === user._id) {
    return user;
  }
  const role = await getUserRole(ctx, user._id);
  if (role === "staff") {
    return user;
  }
  throw new ConvexError("Not authorized to access this document.");
}
