"use client";

import { useActionState } from "react";

import { sendInvite } from "@/app/actions/team";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";

export function InviteMemberForm() {
  const [state, formAction] = useActionState(sendInvite, initialFormState);

  return (
    <div className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Invite Access</p>
        <h2 className="text-2xl font-semibold">Add a team member</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Invite a new user into your organization with one of the approved v1 roles.
        </p>
      </div>
      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="inviteEmail">
            Email
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
            id="inviteEmail"
            name="email"
            placeholder="security.manager@example.com"
            type="email"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="inviteRole">
            Role
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
            defaultValue="staff"
            id="inviteRole"
            name="role"
          >
            <option value="staff">Staff</option>
            <option value="compliance_manager">Compliance Manager</option>
            <option value="org_admin">Organization Admin</option>
          </select>
        </div>
        <SubmitButton pendingLabel="Sending invitation">Send invitation</SubmitButton>
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
