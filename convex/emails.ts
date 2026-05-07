// Outbound transactional email — currently the OTP for email verification
// and password reset.
//
// Implementation note: we hit Resend's REST API directly with `fetch`
// rather than pulling in the `resend` npm package or the
// `@convex-dev/resend` Convex component. The volume here is tiny (a
// handful of emails per sign-up / forgot-password event), so neither the
// SDK ergonomics nor the component's retry/idempotency machinery earns
// the dependency.
//
// Required Convex env vars:
//   - RESEND_API_KEY   (mandatory)   secret from https://resend.com
//   - RESEND_FROM      (optional)    sender address; defaults to
//                                    "SmartRent <onboarding@resend.dev>"
//                                    which works without DNS setup. Swap
//                                    in a verified domain sender for
//                                    production deliverability.

"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const DEFAULT_FROM = "SmartRent <onboarding@resend.dev>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

type OtpEmailType =
  | "email-verification"
  | "forget-password"
  | "sign-in"
  | "change-email";

/**
 * Send an OTP code to a user's email address. Called from better-auth's
 * `emailOTP.sendVerificationOTP` callback in `convex/auth.ts`.
 *
 * This is intentionally an internal action: it should never be exposed
 * to clients (we don't want random callers triggering email sends with
 * arbitrary OTP strings).
 */
export const sendOtpEmail = internalAction({
  args: {
    email: v.string(),
    otp: v.string(),
    // Loosely typed as a string at the boundary because better-auth may
    // add new types in future versions; we explicitly handle the ones we
    // care about and fall back to a generic copy for the rest.
    type: v.string(),
  },
  handler: async (_ctx, { email, otp, type }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Loud failure rather than silent: a missing key should be obvious
      // in dev so the developer wires it up before testing the flow.
      throw new Error(
        "RESEND_API_KEY is not set. Run `npx convex env set RESEND_API_KEY <key>`.",
      );
    }
    const from = process.env.RESEND_FROM ?? DEFAULT_FROM;

    const { subject, html, text } = renderOtpEmail(otp, type as OtpEmailType);

    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      // Surface the Resend error text so misconfig (bad API key, sender
      // not verified, recipient blocked) is debuggable from logs.
      const body = await res.text().catch(() => "<unreadable>");
      throw new Error(
        `Resend send failed (${res.status} ${res.statusText}): ${body}`,
      );
    }
  },
});

/**
 * Renders the email body for each OTP type. The HTML is intentionally
 * minimal and inline-styled — most email clients strip <style> and
 * <link> tags, and we don't need anything fancier than "here is your
 * code, in a big monospaced box".
 */
function renderOtpEmail(
  otp: string,
  type: OtpEmailType,
): { subject: string; html: string; text: string } {
  const intent =
    type === "forget-password"
      ? "reset your SmartRent password"
      : type === "change-email"
        ? "change the email on your SmartRent account"
        : type === "sign-in"
          ? "sign in to SmartRent"
          : "verify your SmartRent email address";

  const subject =
    type === "forget-password"
      ? "Reset your SmartRent password"
      : type === "change-email"
        ? "Confirm your new SmartRent email"
        : type === "sign-in"
          ? "Your SmartRent sign-in code"
          : "Verify your SmartRent email";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FBFAF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#14130F;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E8E5DC;border-radius:12px;padding:32px;">
          <tr><td>
            <div style="font-family:Georgia,'Source Serif 4',serif;font-size:24px;font-weight:600;letter-spacing:-0.01em;margin:0 0 8px;">
              Smart<span style="color:#3457D5;">Rent</span>
            </div>
            <div style="font-size:14px;color:#5E5B53;margin:0 0 24px;">
              Use the code below to ${intent}.
            </div>
            <div style="font-family:'JetBrains Mono','SFMono-Regular',Menlo,Consolas,monospace;font-size:34px;font-weight:600;letter-spacing:0.18em;background:#F4F2EC;border:1px solid #E8E5DC;border-radius:8px;padding:18px 24px;text-align:center;color:#14130F;">
              ${escapeHtml(otp)}
            </div>
            <div style="font-size:12px;color:#5E5B53;margin:24px 0 0;line-height:1.5;">
              This code expires in 5 minutes. If you didn't request it, you can safely ignore this email.
            </div>
          </td></tr>
        </table>
        <div style="font-size:11px;color:#9A968A;margin-top:16px;letter-spacing:0.04em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;">
          SmartRent · document verification
        </div>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Use this code to ${intent}: ${otp}

This code expires in 5 minutes. If you didn't request it, you can ignore this email.

— SmartRent`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
