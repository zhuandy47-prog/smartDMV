"use client";

import { loginSchema } from "@/app/schemas/auth";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(data: z.infer<typeof loginSchema>) {
    startTransition(async () => {
      await authClient.signIn.email({
        email: data.email,
        password: data.password,
        fetchOptions: {
          onSuccess: () => {
            toast.success("Logged in.");
            router.push("/");
          },
          onError: (error) => {
            // If the password is right but the email isn't verified yet,
            // better-auth returns a structured `EMAIL_NOT_VERIFIED` code.
            // In that case route the user to the OTP screen with their
            // email preloaded — the plugin will resend a fresh code on
            // the next request from that page if they hit "Resend".
            if (error.error.code === "EMAIL_NOT_VERIFIED") {
              toast.message("Verify your email to sign in.");
              router.push(
                `/auth/verify?email=${encodeURIComponent(data.email)}`,
              );
              return;
            }
            toast.error(error.error.message);
          },
        },
      });
    });
  }

  return (
    <div className="auth-card view">
      <h1>Welcome back.</h1>
      <p className="sub">Sign in to upload, review, and track your documents.</p>

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

        <button
          type="submit"
          className="btn btn-primary submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="switch">
        <Link href="/auth/forgot-password">Forgot password?</Link>
      </div>
      <div className="switch">
        New to SmartRent? <Link href="/auth/sign-up">Create an account</Link>
      </div>
    </div>
  );
}
