// Daily auto-deletion of regular user accounts after the 60-day TTL.
//
// Triggered by the cron registered in `convex/crons.ts`. Staff accounts
// never expire. When a user is purged we cascade through their app data
// (documents + storage files, comments, role record) and the better-auth
// records that reference them (the user row itself, sessions, accounts).
// Audit-log entries are deliberately KEPT — they record staff actions, not
// user PII, and removing them would corrupt review history.
//
// The cron is bounded so a single run can never spike write load: we walk
// up to MAX_PAGES of the user table per run and purge at most
// PURGE_LIMIT_PER_RUN expired accounts. Any backlog gets caught the next day.

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
// Page size when walking the better-auth user table. The user table doesn't
// have a `createdAt` index, so the adapter scans within each page and we
// filter in memory. 200 keeps each query well under Convex limits.
const SCAN_PAGE_SIZE = 200;
// Outer iteration cap on `runDailyCleanup`. With SCAN_PAGE_SIZE=200 this
// covers up to 10k users in one run, which is plenty for this app.
const MAX_PAGES = 50;
// Maximum users actually purged in a single cron tick. Spreads write load
// across days if there's ever a backlog (e.g. first run after a long gap).
const PURGE_LIMIT_PER_RUN = 50;

/**
 * Returns one page of expired non-staff auth user IDs. Pagination cursor
 * is opaque to callers — pass `null` to start, then thread the returned
 * `continueCursor` until `isDone` is true.
 *
 * The "clock" for each user is the most recent of:
 *   - their userRoles.userSinceAt (signup time, or last demotion time)
 *   - the better-auth user's createdAt (fallback for legacy records
 *     without userSinceAt — which behaves the same as today's logic)
 *
 * Staff are skipped entirely. This keeps promotion safe (staff never
 * expire) and demotion safe (the clock resets to "now" in setRole, so
 * a freshly demoted user always has a full 60 days from the demotion).
 */
export const findExpiredNonStaffUserIds = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (
    ctx,
    { cursor },
  ): Promise<{
    expired: string[];
    isDone: boolean;
    continueCursor: string;
  }> => {
    const cutoff = Date.now() - SIXTY_DAYS_MS;

    // One pass over userRoles: build the staff-id set AND a map of
    // user-id -> userSinceAt for non-staff. Tiny table in practice.
    const allRoles = await ctx.db.query("userRoles").collect();
    const staffIds = new Set<string>();
    const userSinceMap = new Map<string, number>();
    for (const r of allRoles) {
      if (r.role === "staff") {
        staffIds.add(r.userId);
      } else if (typeof r.userSinceAt === "number") {
        userSinceMap.set(r.userId, r.userSinceAt);
      }
    }

    const result = (await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: { numItems: SCAN_PAGE_SIZE, cursor },
      },
    )) as {
      page: Array<{ _id: string; createdAt: number }>;
      isDone: boolean;
      continueCursor: string;
    };

    const expired: string[] = [];
    for (const user of result.page ?? []) {
      if (staffIds.has(user._id)) continue;
      const fallback = user.createdAt;
      if (typeof fallback !== "number") continue;
      // Effective clock: explicit userSinceAt if set, otherwise the auth
      // user's createdAt (legacy / no userRoles record yet).
      const effectiveSince = userSinceMap.get(user._id) ?? fallback;
      if (effectiveSince > cutoff) continue;
      expired.push(user._id);
    }
    return {
      expired,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Deletes all data tied to a single auth user. Idempotent — calling it
 * twice on the same id is a no-op the second time (each lookup just
 * returns nothing).
 */
export const purgeUser = internalMutation({
  args: { authUserId: v.string() },
  handler: async (ctx, { authUserId }) => {
    // 1. App documents owned by the user (and their underlying storage
    //    files, so we don't leak blobs). storageId is stored as a string;
    //    cast to Id<"_storage"> for the storage API.
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", authUserId))
      .collect();
    for (const doc of docs) {
      try {
        await ctx.storage.delete(doc.storageId as Id<"_storage">);
      } catch {
        // Storage entry may already be gone (e.g. partial earlier purge).
        // Swallow so the doc row still gets removed.
      }
      await ctx.db.delete(doc._id);
    }

    // 2. Comments authored by the user, across every document. There's no
    //    `by_author` index, but realistic comment counts per user are
    //    small and the cron runs once a day, so a filter scan is fine.
    const myComments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("authorId"), authUserId))
      .collect();
    for (const c of myComments) {
      await ctx.db.delete(c._id);
    }

    // 3. The user's role record (if they have one).
    const roleRow = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", authUserId))
      .first();
    if (roleRow) {
      await ctx.db.delete(roleRow._id);
    }

    // 4. Better-auth: user row + sessions + accounts. We don't use OAuth /
    //    2FA / verification flows, so those tables won't have rows for
    //    this user — nothing to clean there.
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: authUserId }],
      },
    });
    // For sessions/accounts each user typically has 1–2 rows; one page of
    // 200 is far more than enough.
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "session",
        where: [{ field: "userId", value: authUserId }],
      },
      paginationOpts: { numItems: 200, cursor: null },
    });
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "account",
        where: [{ field: "userId", value: authUserId }],
      },
      paginationOpts: { numItems: 200, cursor: null },
    });
  },
});

/**
 * Cron entry point. Walks the user table page by page, purging expired
 * non-staff accounts up to PURGE_LIMIT_PER_RUN. Returns the count for
 * cron logs / debugging.
 */
export const runDailyCleanup = internalAction({
  args: {},
  handler: async (ctx): Promise<{ purged: number }> => {
    let cursor: string | null = null;
    let purged = 0;

    for (let i = 0; i < MAX_PAGES; i++) {
      const result: {
        expired: string[];
        isDone: boolean;
        continueCursor: string;
      } = await ctx.runQuery(
        internal.account_lifecycle.findExpiredNonStaffUserIds,
        { cursor },
      );

      for (const authUserId of result.expired) {
        if (purged >= PURGE_LIMIT_PER_RUN) break;
        await ctx.runMutation(internal.account_lifecycle.purgeUser, {
          authUserId,
        });
        purged += 1;
      }

      if (purged >= PURGE_LIMIT_PER_RUN || result.isDone) break;
      cursor = result.continueCursor;
    }

    return { purged };
  },
});
