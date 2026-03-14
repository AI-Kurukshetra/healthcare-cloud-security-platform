"use client";

import Link from "next/link";
import { useActionState } from "react";

import { updatePassword } from "@/app/actions/auth";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initialFormState);

  return (
    <div className="flex h-full min-h-[28rem] flex-col justify-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Password Recovery</p>
        <h2 className="text-3xl font-semibold tracking-tight">Choose a new password.</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Set a new password for your account using the active recovery session.
        </p>
      </div>
      <form action={formAction} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            New password
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
            id="password"
            minLength={8}
            name="password"
            placeholder="Enter your new password"
            type="password"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="confirmPassword">
            Confirm new password
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
            id="confirmPassword"
            minLength={8}
            name="confirmPassword"
            placeholder="Re-enter your new password"
            type="password"
          />
        </div>
        <SubmitButton pendingLabel="Updating password">Update password</SubmitButton>
      </form>
      {state.message ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            state.status === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <div className="mt-6 text-sm text-muted-foreground">
        <Link className="underline underline-offset-4" href="/login">
          Back to login
        </Link>
      </div>
    </div>
  );
}
