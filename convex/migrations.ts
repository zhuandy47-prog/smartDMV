// One-shot data migrations. Run via `npx convex run migrations:<name>`.
//
// Each migration is an `internalAction` (or `internalMutation`) that's
// idempotent: re-running it on already-migrated data should be a no-op.

import { internalAction, internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { v } from "convex/values";

// Page size when walking the better-auth user table. Stays well under
// Convex per-query read limits, and we keep paging until done.
const PAGE_SIZE = 200;

/**
 * Marks every existing better-auth user as `emailVerified: true`.
 *
 * Why: this codebase originally ran with `requireEmailVerification: false`,
 * which let users sign up with arbitrary (often fake) emails. Flipping
 * the flag to `true` would lock those accounts out of sign-in until
 * they re-verify — including any test accounts. This migration walks
 * the user table once and patches the flag where missing/false, so
 * pre-existing accounts keep working post-rollout.
 *
 * Idempotent: rows already marked `true` are skipped.
 *
 * Run once after deploying the email-OTP changes:
 *   npx convex run migrations:markAllUsersVerified
 */
export const markAllUsersVerified = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scanned: number; patched: number }> => {
    let cursor: string | null = null;
    let scanned = 0;
    let patched = 0;

    // Cap the outer loop at 200 pages = 40k users. Way beyond anything
    // realistic for this app, just a safety net against a misbehaving
    // pagination cursor.
    for (let i = 0; i < 200; i++) {
      const result: {
        page: Array<{ _id: string; emailVerified: boolean }>;
        isDone: boolean;
        continueCursor: string;
      } = await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "user",
        paginationOpts: { numItems: PAGE_SIZE, cursor },
      });

      for (const u of result.page) {
        scanned += 1;
        if (u.emailVerified) continue;
        await ctx.runMutation(
          internal.migrations.markOneUserVerified,
          { authUserId: u._id },
        );
        patched += 1;
      }

      if (result.isDone) break;
      cursor = result.continueCursor;
    }

    return { scanned, patched };
  },
});

/**
 * Internal helper called by `markAllUsersVerified`. Patches a single
 * user record. Pulled out as a mutation so each user-update runs in its
 * own transaction (the action loop can't directly write).
 */
export const markOneUserVerified = internalMutation({
  args: { authUserId: v.string() },
  handler: async (ctx, { authUserId }) => {
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: authUserId }],
        update: { emailVerified: true },
      },
    });
  },
});
