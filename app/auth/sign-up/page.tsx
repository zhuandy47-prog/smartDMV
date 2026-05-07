"use client";

import { signUpSchema } from "@/app/schemas/auth";
import { authClient } from "@/lib/auth-client";
import { STAFF_INVITE_STORAGE_KEY } from "@/components/web/AuthEffects";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function SignUpPage() {
  const [isPending, startTransition] = useTransition();
  const [isStaff, setIsStaff] = useState(false);
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", name: "", password: "", inviteCode: "" },
  });

  function onSubmit(data: z.infer<typeof signUpSchema>) {
    startTransition(async () => {
      if (isStaff && !data.inviteCode?.trim()) {
        toast.error("Staff invite code is required.");
        return;
      }
      // Stash code so AuthEffects redeems it after Convex picks up the session.
      if (isStaff && data.inviteCode) {
        sessionStorage.setItem(
          STAFF_INVITE_STORAGE_KEY,
          data.inviteCode.trim(),
        );
      } else {
        sessionStorage.removeItem(STAFF_INVITE_STORAGE_KEY);
      }

      await authClient.signUp.email({
        email: data.email,
        name: data.name,
        password: data.password,
        fetchOptions: {
          // Email verification is now required, so sign-up no longer
          // signs the user in. Better-auth's emailOTP plugin
          // (`sendVerificationOnSignUp: true`) has already fired the
          // first 6-digit code by the time onSuccess runs — route the
          // user to the verify screen with their email preserved so
          // they can type the code immediately.
          onSuccess: () => {
            toast.success("Account created. Check your email for a code.");
            router.push(
              `/auth/verify?email=${encodeURIComponent(data.email)}`,
            );
          },
          onError: (error) => {
            sessionStorage.removeItem(STAFF_INVITE_STORAGE_KEY);
            toast.error(error.error.message);
          },
        },
      });
    });
  }

  return (
    <div className="auth-card view">
      <h1>Create an account.</h1>
      <p className="sub">
        Verify documents in minutes, not days. No credit card required.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                placeholder="Andy Zhu"
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

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
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
            id="is-staff"
            type="checkbox"
            checked={isStaff}
            onChange={(e) => setIsStaff(e.target.checked)}
          />
          <label htmlFor="is-staff">I&apos;m signing up as staff</label>
        </div>

        {isStaff && (
          <Controller
            name="inviteCode"
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="field">
                <label htmlFor="invite">Staff invite code</label>
                <input
                  id="invite"
                  type="text"
                  placeholder="Provided by your admin"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.error && (
                  <div className="field-error">{fieldState.error.message}</div>
                )}
              </div>
            )}
          />
        )}

        <button
          type="submit"
          className="btn btn-primary submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <div className="switch">
        Already have an account? <Link href="/auth/login">Sign in</Link>
      </div>
    </div>
  );
}
