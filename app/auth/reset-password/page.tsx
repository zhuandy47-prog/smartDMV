"use client";

import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

// Same password rules as sign-up (8–30 chars). Email is filled from the
// query string; OTP is the 6-digit code from the email.
const resetSchema = z
  .object({
    otp: z.string().length(6).regex(/^\d{6}$/, "Code must be 6 digits"),
    password: z.string().min(8).max(30),
    confirm: z.string().min(8).max(30),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

/**
 * Step 2 of the password-reset flow. The user lands here from
 * `/auth/forgot-password` with `?email=…` in the query string and a
 * 6-digit code in their inbox.
 *
 * On success, better-auth atomically resets the password AND signs the
 * user in (the emailOTP plugin's atomListener triggers a session
 * refresh), so we just route them to "/" and let the navbar light up.
 */
function ResetInner() {
  const router = useRouter();
  const search = useSearchParams();
  const email = search.get("email") ?? "";

  const [isPending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();
  // Hook ordering: every useState/useTransition has to run before any
  // early return below so the hook count stays stable across renders.
  const [showPwd, setShowPwd] = useState(false);

  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", password: "", confirm: "" },
  });

  function onSubmit(data: z.infer<typeof resetSchema>) {
    if (!email) {
      toast.error("Missing email — start the reset from /auth/forgot-password.");
      return;
    }
    startTransition(async () => {
      // better-auth's `/email-otp/reset-password` endpoint updates the
      // password but never issues a session cookie (verified by reading
      // the plugin source). Fix it by chaining a `signIn.email` here on
      // success: we already have the email (from the URL) and the new
      // plaintext password (from this form's state), so the second
      // request is essentially free.
      const reset = await authClient.emailOtp.resetPassword({
        email,
        otp: data.otp.trim(),
        password: data.password,
      });
      if (reset.error) {
        toast.error(reset.error.message ?? "Couldn't reset password.");
        return;
      }
      await authClient.signIn.email({
        email,
        password: data.password,
        fetchOptions: {
          onSuccess: () => {
            toast.success("Password updated. You're signed in.");
            router.push("/");
          },
          onError: (err) => {
            // The password change went through, but the auto-sign-in
            // didn't — surface that distinction so the user knows they
            // can retry on the login page rather than thinking the
            // reset itself failed.
            toast.error(
              err.error.message ??
                "Password updated, but couldn't sign you in. Please log in.",
            );
            router.push("/auth/login");
          },
        },
      });
    });
  }

  function handleResend() {
    if (!email) return;
    startResend(async () => {
      await authClient.forgetPassword.emailOtp({
        email,
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

  // Same guard as the verify page — without an email we can't proceed.
  if (!email) {
    return (
      <div className="auth-card view">
        <h1>Reset your password.</h1>
        <p className="sub">
          We&apos;re missing the email address for this reset. Please start
          again from forgot-password.
        </p>
        <div className="switch">
          <Link href="/auth/forgot-password">Back to reset</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card view">
      <h1>Set a new password.</h1>
      <p className="sub">
        We sent a 6-digit code to <strong>{email}</strong>. Enter it along
        with your new password.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Controller
          name="otp"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="field">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                aria-invalid={fieldState.invalid}
                {...field}
                onChange={(e) =>
                  field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                style={{
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.4em",
                  textAlign: "center",
                  fontSize: 20,
                }}
              />
              {fieldState.error && (
                <div className="field-error">{fieldState.error.message}</div>
              )}
            </div>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                aria-invalid={fieldState.invalid}
                {...field}
              />
              {fieldState.error && (
                <div className="field-error">{fieldState.error.message}</div>
              )}
            </div>
          )}
        />

        <Controller
          name="confirm"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                aria-invalid={fieldState.invalid}
                {...field}
              />
              {fieldState.error && (
                <div className="field-error">{fieldState.error.message}</div>
              )}
            </div>
          )}
        />

        <div className="row">
          <input
            id="show-pwd"
            type="checkbox"
            checked={showPwd}
            onChange={(e) => setShowPwd(e.target.checked)}
          />
          <label htmlFor="show-pwd">Show passwords</label>
        </div>

        <button
          type="submit"
          className="btn btn-primary submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Resetting…
            </>
          ) : (
            "Reset password"
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
        Remembered it? <Link href="/auth/login">Sign in</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-card view">
          <h1>Set a new password.</h1>
          <p className="sub">Loading…</p>
        </div>
      }
    >
      <ResetInner />
    </Suspense>
  );
}
