"use client";

import { useActionState } from "react";

import { resendInvite, revokeInvitation, revokeMembership, updateMemberRole } from "@/app/actions/team";
import { initialFormState } from "@/lib/forms/form-state";
import type { AppRole } from "@/lib/auth/permissions";

type MemberSummary = {
  id: string;
  user_id: string;
  role: AppRole;
  status: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
};

type InvitationSummary = {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  expires_at: string;
};

type MemberAccessPanelProps = Readonly<{
  canInviteUsers: boolean;
  canManageRoles: boolean;
  currentUserId: string;
  invitations: InvitationSummary[];
  members: MemberSummary[];
}>;

function MemberRow({
  canManageRoles,
  currentUserId,
  member,
}: Readonly<{
  canManageRoles: boolean;
  currentUserId: string;
  member: MemberSummary;
}>) {
  const [roleState, roleAction] = useActionState(updateMemberRole, initialFormState);
  const [revokeState, revokeAction] = useActionState(revokeMembership, initialFormState);
  const isCurrentUser = currentUserId === member.user_id;

  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">{member.profiles?.full_name ?? "Invited user"}</p>
          <p className="text-sm text-muted-foreground">{member.profiles?.email ?? "No email available"}</p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <form action={roleAction} className="flex flex-col gap-2 md:flex-row">
            <input name="membershipId" type="hidden" value={member.id} />
            <select
              className="rounded-full border border-border bg-card px-4 py-2 text-sm"
              defaultValue={member.role}
              disabled={!canManageRoles || isCurrentUser}
              name="role"
            >
              <option value="staff">Staff</option>
              <option value="compliance_manager">Compliance Manager</option>
              <option value="org_admin">Organization Admin</option>
            </select>
            <button
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
              disabled={!canManageRoles || isCurrentUser}
              type="submit"
            >
              Save role
            </button>
          </form>
          <form action={revokeAction}>
            <input name="membershipId" type="hidden" value={member.id} />
            <button
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              disabled={!canManageRoles || isCurrentUser}
              type="submit"
            >
              Revoke access
            </button>
          </form>
        </div>
      </div>
      {roleState.message ? (
        <p className={`mt-3 text-sm ${roleState.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{roleState.message}</p>
      ) : null}
      {revokeState.message ? (
        <p className={`mt-3 text-sm ${revokeState.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>
          {revokeState.message}
        </p>
      ) : null}
    </div>
  );
}

function InvitationRow({ canInviteUsers, invitation }: Readonly<{ canInviteUsers: boolean; invitation: InvitationSummary }>) {
  const [resendState, resendAction] = useActionState(resendInvite, initialFormState);
  const [revokeState, revokeAction] = useActionState(revokeInvitation, initialFormState);

  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">{invitation.email}</p>
          <p className="text-sm text-muted-foreground">
            {invitation.role} | expires {new Date(invitation.expires_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={resendAction}>
            <input name="invitationId" type="hidden" value={invitation.id} />
            <button
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
              disabled={!canInviteUsers}
              type="submit"
            >
              Resend
            </button>
          </form>
          <form action={revokeAction}>
            <input name="invitationId" type="hidden" value={invitation.id} />
            <button
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              disabled={!canInviteUsers}
              type="submit"
            >
              Revoke
            </button>
          </form>
        </div>
      </div>
      {resendState.message ? (
        <p className={`mt-3 text-sm ${resendState.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{resendState.message}</p>
      ) : null}
      {revokeState.message ? (
        <p className={`mt-3 text-sm ${revokeState.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{revokeState.message}</p>
      ) : null}
    </div>
  );
}

export function MemberAccessPanel({
  canInviteUsers,
  canManageRoles,
  currentUserId,
  invitations,
  members,
}: MemberAccessPanelProps) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Team Access</p>
        <h2 className="text-2xl font-semibold">Roles and invitations</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Review active memberships and monitor pending invites for your organization.
        </p>
      </div>
      <div className="mt-6 space-y-4">
        {members.map((member) => (
          <MemberRow
            canManageRoles={canManageRoles}
            currentUserId={currentUserId}
            key={member.id}
            member={member}
          />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        <h3 className="text-lg font-semibold">Pending invitations</h3>
        {invitations.length ? (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <InvitationRow canInviteUsers={canInviteUsers} invitation={invitation} key={invitation.id} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No pending invitations.
          </p>
        )}
      </div>
    </div>
  );
}
