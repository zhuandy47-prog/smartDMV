"use client";

import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

// Single field — just the email. Reuses zod for parity with the other
// auth forms.
const forgotPasswordSchema = z.object({
  email: z.email(),
});

/**
 * Step 1 of the password-reset flow: collect the user's email, ask
 * better-auth to send an OTP with `type: "forget-password"`, and
 * forward to `/auth/reset-password` where the user types the code +
 * a new password.
 *
 * For privacy, we navigate forward unconditionally — never reveal
 * whether the email exists in the database. If it doesn't, the user
 * sees the same "we sent a code" UX and the OTP just never arrives.
 * (Better-auth doesn't error when you request a reset for a missing
 * account; it returns success and silently drops the send.)
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(data: z.infer<typeof forgotPasswordSchema>) {
    startTransition(async () => {
      await authClient.forgetPassword.emailOtp({
        email: data.email,
        fetchOptions: {
          onSuccess: () => {
            setSubmittedEmail(data.email);
            toast.success("If that email exists, we sent a code.");
            router.push(
              `/auth/reset-password?email=${encodeURIComponent(data.email)}`,
            );
          },
          onError: (error) => {
            // Surface unexpected errors (rate limit, etc.) but not
            // "email not found" — better-auth handles that quietly.
            toast.error(error.error.message ?? "Couldn't send code.");
          },
        },
      });
    });
  }

  return (
    <div className="auth-card view">
      <h1>Reset your password.</h1>
      <p className="sub">
        Enter the email on your account and we&apos;ll send a 6-digit code to
        confirm it&apos;s really you.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={fieldState.invalid}
                {...field}
              />
              {fieldState.error && (
                <div className="field-error">{fieldState.error.message}</div>
              )}
            </div>
          )}
        />

        <button
          type="submit"
          className="btn btn-primary submit"
          disabled={isPending || submittedEmail !== null}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending code…
            </>
          ) : (
            "Send code"
          )}
        </button>
      </form>

      <div className="switch">
        Remembered it? <Link href="/auth/login">Sign in</Link>
      </div>
    </div>
  );
}
