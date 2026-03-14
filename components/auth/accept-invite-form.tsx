"use client";

import { useActionState } from "react";

import { acceptInvite } from "@/app/actions/team";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";

type AcceptInviteFormProps = Readonly<{
  invitationId: string;
}>;

export function AcceptInviteForm({ invitationId }: AcceptInviteFormProps) {
  const [state, formAction] = useActionState(acceptInvite, initialFormState);

  return (
    <form action={formAction} className="space-y-5">
      <input name="invitationId" type="hidden" value={invitationId} />
      <SubmitButton pendingLabel="Joining organization">Accept invitation</SubmitButton>
      {state.message ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p>
      ) : null}
    </form>
  );
}
