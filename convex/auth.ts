import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins/email-otp";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Email + password is the only sign-in method we expose. Verification
    // is now mandatory — `requireEmailVerification: true` blocks sign-in
    // until the email is confirmed via the OTP flow below. Existing
    // accounts created before this change should be backfilled with
    // `emailVerified: true` (see `convex/migrations.ts`) so they aren't
    // suddenly locked out.
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    // Auto-sign-in after the user submits a valid verification OTP.
    // Without this flag, better-auth's `/email-otp/verify-email` endpoint
    // marks the email verified but never issues a session cookie — the
    // user finishes the OTP screen and lands on a still-anonymous "/"
    // and would have to manually log in. With it set, the same endpoint
    // also calls `createSession` + `setSessionCookie` on success, so the
    // OTP submission *is* the sign-in.
    //
    // Note: this only covers the post-signup verify flow. The
    // `/email-otp/reset-password` endpoint never creates a session
    // regardless of this flag, so the reset-password page handles its
    // own sign-in client-side after `resetPassword` returns.
    emailVerification: {
      autoSignInAfterVerification: true,
    },
    plugins: [
      emailOTP({
        // Use 6-digit codes via email instead of click-to-verify links.
        // `overrideDefaultEmailVerification` makes better-auth's verify
        // flow route through this plugin (codes), and
        // `sendVerificationOnSignUp` fires the first code automatically
        // the moment the account is created — no separate "request OTP"
        // step needed.
        overrideDefaultEmailVerification: true,
        sendVerificationOnSignUp: true,
        // Same callback handles all three flows we use today:
        //   - "email-verification" (post sign-up)
        //   - "forget-password"    (reset flow)
        // Future-proofed for "change-email" and "sign-in" too — the
        // email renderer adapts the copy by `type`.
        sendVerificationOTP: async ({ email, otp, type }) => {
          // `sendVerificationOTP` only fires while better-auth is handling
          // an HTTP request, and those routes are registered as HTTP
          // actions, so ctx is always an action context at runtime. The
          // `"runAction" in ctx` check narrows GenericCtx (a union of
          // QueryCtx | MutationCtx | ActionCtx) to the action variant
          // and fails loudly if anything ever invokes better-auth from a
          // non-action context.
          if (!("runAction" in ctx)) {
            throw new Error(
              "sendVerificationOTP requires an action context to dispatch the email send.",
            );
          }
          await ctx.runAction(internal.emails.sendOtpEmail, {
            email,
            otp,
            type,
          });
        },
      }),
      // The Convex plugin is required for Convex compatibility
      convex({ authConfig }),
    ],
  });
};

// Returns a curated profile for the signed-in user, or `null` if the
// caller isn't signed in.
//
// Why a projection instead of the full better-auth user record:
//   1. The full record carries fields the frontend never reads — phone,
//      twoFactorEnabled, isAnonymous, displayUsername, etc. Returning
//      them ships extra bytes over the websocket and quietly leaks any
//      new field better-auth adds in a future version.
//   2. `safeGetAuthUser` (vs. `getAuthUser`) means subscriptions still
//      mounted during sign-out don't throw during the brief window
//      between websocket auth invalidation and the React tree unmounting.
//
// Callers must treat the result as nullable.
export const getCurrentUser = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    _id: string;
    name: string;
    email: string;
    createdAt: number;
  } | null> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  },
});
