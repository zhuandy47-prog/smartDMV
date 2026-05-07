import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getUserRole, requireStaff, Role } from "./auth_helpers";

// Returns the current user's role, or null if not signed in.
// Use this in the navbar / route guards.
export const myRole = query({
  args: {},
  handler: async (ctx): Promise<Role | null> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    return await getUserRole(ctx, user._id);
  },
});

// Returns the timestamp (ms since epoch) at which the current user's
// 60-day account-deletion clock starts ticking — i.e. signup time, or
// the most recent demotion-to-user time, whichever is later.
//
// Returns:
//   - null while loading the auth identity, when not signed in, or when
//     the caller is staff (staff accounts never expire).
//   - a number for regular users.
//
// The countdown UI in the navbar dropdown calls this; the cron derives
// the same value server-side from userRoles + better-auth createdAt.
export const myAccountSince = query({
  args: {},
  handler: async (ctx): Promise<number | null> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const roleRow = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Staff: no expiration.
    if (roleRow?.role === "staff") return null;

    // Regular user: prefer the explicit clock, fall back to the auth
    // user's createdAt (covers users created before this field existed,
    // and users who never went through claimRole for whatever reason).
    return roleRow?.userSinceAt ?? user.createdAt;
  },
});

// Called once after sign-up, and idempotently on login as a backfill.
// - No invite code → user is "user" (the default).
// - Invite code matches STAFF_INVITE_CODE env → user becomes "staff".
// - Invite code provided but wrong → throws.
// If a record already exists, returns the existing role unchanged but
// refreshes the cached email/name in case they changed.
export const claimRole = mutation({
  args: { inviteCode: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Role> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new ConvexError("Not Authenticated!");
    }

    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) {
      // Refresh denormalised fields if the auth profile changed.
      if (existing.email !== user.email || existing.name !== user.name) {
        await ctx.db.patch(existing._id, {
          email: user.email,
          name: user.name ?? undefined,
        });
      }
      return existing.role;
    }

    let role: Role = "user";
    if (args.inviteCode && args.inviteCode.trim().length > 0) {
      const expected = process.env.STAFF_INVITE_CODE;
      if (!expected) {
        throw new ConvexError(
          "Staff invite system is not configured. Ask an admin to set STAFF_INVITE_CODE.",
        );
      }
      if (args.inviteCode.trim() !== expected) {
        throw new ConvexError("Invalid staff invite code.");
      }
      role = "staff";
    }

    await ctx.db.insert("userRoles", {
      userId: user._id,
      role,
      email: user.email,
      name: user.name ?? undefined,
      // Start the deletion clock now for fresh users. Harmless for staff
      // since the cron and the countdown ignore this field for them; if
      // they're ever demoted, setRole will overwrite it with the demotion
      // time anyway.
      userSinceAt: Date.now(),
    });
    return role;
  },
});

// Staff only: list every user that has a role record.
// Users only appear here after they've signed up or logged in once since
// roles were introduced (since claimRole runs on those events).
export const listAllRoles = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    return await ctx.db.query("userRoles").take(500);
  },
});

// Staff only: change a target user's role.
// Self-demotion is forbidden so the system can never lose its last admin
// from the UI alone.
//
// Demotion (staff -> user) resets the 60-day deletion clock by setting
// userSinceAt = now. Without this, a staff member of months/years would
// be flagged for deletion on the very next cron run after demotion.
// Promotion (user -> staff) leaves userSinceAt alone — staff are exempt
// from the cron, so the field is irrelevant while they hold that role.
// If they're later demoted again, this branch will reset the clock again.
export const setRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("staff")),
  },
  handler: async (ctx, args) => {
    const me = await requireStaff(ctx);
    if (args.userId === me._id && args.role !== "staff") {
      throw new ConvexError("You cannot demote yourself.");
    }

    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const isDemotion = existing?.role === "staff" && args.role === "user";

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        // Reset the clock on demotion. On promotion, leave the field as-is.
        ...(isDemotion ? { userSinceAt: Date.now() } : {}),
      });
    } else {
      // Target hasn't claimed a role yet — create one with no email/name.
      // Their next claimRole call (on login) will backfill those fields.
      // Stamp userSinceAt now so the clock starts from this moment if
      // they're being created as a regular user; for staff it's harmless.
      await ctx.db.insert("userRoles", {
        userId: args.userId,
        role: args.role,
        userSinceAt: Date.now(),
      });
    }
  },
});
