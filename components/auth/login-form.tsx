"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInWithPassword } from "@/app/actions/auth";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";

type LoginFormProps = Readonly<{
  redirectTo?: string;
}>;

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction] = useActionState(signInWithPassword, initialFormState);

  return (
    <div className="flex h-full min-h-[28rem] flex-col justify-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Login</p>
        <h2 className="text-3xl font-semibold tracking-tight">Sign in to continue.</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Access is invite-only. Organization admins, compliance managers, and staff all authenticate through the same secure entry point.
        </p>
      </div>
      <form action={formAction} className="mt-8 space-y-5">
        {redirectTo ? <input name="redirectTo" type="hidden" value={redirectTo} /> : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
            id="email"
            name="email"
            placeholder="care.team@example.com"
            type="email"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
            id="password"
            name="password"
            placeholder="Enter your password"
            type="password"
          />
        </div>
        <SubmitButton pendingLabel="Signing in">Continue</SubmitButton>
      </form>
      {state.message ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <Link className="underline underline-offset-4" href="/register">
          Invite-only access
        </Link>
        <Link className="underline underline-offset-4" href="/reset-password">
          Reset password
        </Link>
      </div>
    </div>
  );
}
