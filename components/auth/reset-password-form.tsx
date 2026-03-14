"use client";

import { useActionState } from "react";

import { requestPasswordReset } from "@/app/actions/auth";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialFormState);

  return (
    <div className="flex h-full min-h-[28rem] flex-col justify-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Reset Password</p>
        <h2 className="text-3xl font-semibold tracking-tight">Request a password reset link.</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Enter the email tied to your invite-only account and we will send a secure recovery link.
        </p>
      </div>
      <form action={formAction} className="mt-8 space-y-5">
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
        <SubmitButton pendingLabel="Sending reset link">Send reset link</SubmitButton>
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
    </div>
  );
}
