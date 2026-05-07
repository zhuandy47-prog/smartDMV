"use client";

import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { toast } from "sonner";

/**
 * Email-OTP verification screen. Reached automatically right after sign-up
 * — the email-OTP plugin's `sendVerificationOnSignUp: true` makes
 * better-auth fire the first OTP on account creation, so by the time
 * the user lands here the code is already in their inbox.
 *
 * Also reached when login is rejected with `EMAIL_NOT_VERIFIED` (the
 * login page redirects here, preserving the email in the query string).
 *
 * On a successful `verifyEmail` better-auth atomically marks the email
 * verified AND creates a session, so the user is signed in by the time
 * we navigate to "/".
 */
function VerifyInner() {
  const router = useRouter();
  const search = useSearchParams();
  const email = search.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [resending, startResend] = useTransition();

  const canSubmit = otp.trim().length === 6 && !!email;

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    startSubmit(async () => {
      await authClient.emailOtp.verifyEmail({
        email,
        otp: otp.trim(),
        fetchOptions: {
          onSuccess: () => {
            toast.success("Email verified.");
            router.push("/");
          },
          onError: (err) => {
            toast.error(err.error.message ?? "Verification failed.");
          },
        },
      });
    });
  }

  function handleResend() {
    if (!email) return;
    startResend(async () => {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
        fetchOptions: {
          onSuccess: () => {
            toast.success("New code sent.");
          },
          onError: (err) => {
            toast.error(err.error.message ?? "Couldn't send code.");
          },
        },
      });
    });
  }

  // Edge case: someone hits this URL directly without ?email=…. Without
  // an email we can't verify or resend, so guide them back to sign-up.
  if (!email) {
    return (
      <div className="auth-card view">
        <h1>Verify your email.</h1>
        <p className="sub">
          We&apos;re missing the email address for this verification. Please
          start from sign-up again.
        </p>
        <div className="switch">
          <Link href="/auth/sign-up">Back to sign-up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card view">
      <h1>Check your email.</h1>
      <p className="sub">
        We sent a 6-digit code to <strong>{email}</strong>. Enter it below to
        finish setting up your account.
      </p>

      <form onSubmit={handleVerify} noValidate>
        <div className="field">
          <label htmlFor="otp">Verification code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            // Looks better as a centered, mono-spaced code box.
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.4em",
              textAlign: "center",
              fontSize: 20,
            }}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary submit"
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify email"
          )}
        </button>
      </form>

      <div className="switch">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          className="btn-link"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Sending…" : "Resend"}
        </button>
      </div>
      <div className="switch">
        Wrong address? <Link href="/auth/sign-up">Sign up again</Link>
      </div>
    </div>
  );
}

// `useSearchParams` requires a Suspense boundary in the App Router for
// static prerendering. The fallback is a light placeholder; in practice
// this loads instantly on client navigation.
export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-card view">
          <h1>Check your email.</h1>
          <p className="sub">Loading…</p>
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
