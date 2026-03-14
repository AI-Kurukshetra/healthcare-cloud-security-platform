"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/auth/audit";
import type { FormState } from "@/lib/forms/form-state";
import { getRequestOrigin } from "@/lib/auth/url";
import { createAdminClient } from "@/lib/supabase/server";
import {
  acceptInviteSchema,
  inviteUserSchema,
  manageInvitationSchema,
  revokeMembershipSchema,
  updateMemberRoleSchema,
} from "@/lib/validations/invitations";

function invitationRedirect(origin: string, invitationId: string) {
  return `${origin}/accept-invite?invitation=${invitationId}`;
}

function isInviteRateLimitError(message: string | undefined) {
  if (!message) {
    return false;
  }

  return message.toLowerCase().includes("rate limit");
}

export async function sendInvite(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "invite_users")) {
    return {
      status: "error",
      message: "You do not have permission to invite users.",
    };
  }

  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid invite.",
    };
  }

  const admin = createAdminClient();
  const normalizedEmail = parsed.data.email.toLowerCase();
  const { data: existingInvite } = await admin
    .from("invitations")
    .select("id")
    .eq("organization_id", context.organization.id)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle<{ id: string }>();

  if (existingInvite) {
    return {
      status: "error",
      message: "A pending invite already exists for this email.",
    };
  }

  const { data: invitation, error: invitationError } = await admin
    .from("invitations")
    .insert({
      organization_id: context.organization.id,
      email: normalizedEmail,
      role: parsed.data.role,
      invited_by: context.user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (invitationError || !invitation) {
    return {
      status: "error",
      message: invitationError?.message ?? "Unable to create invitation.",
    };
  }

  const origin = await getRequestOrigin();
  const { data: invitedUser, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: {
      invitationId: invitation.id,
      organizationId: context.organization.id,
      role: parsed.data.role,
    },
    redirectTo: invitationRedirect(origin, invitation.id),
  });

  if (inviteError) {
    if (isInviteRateLimitError(inviteError.message)) {
      await logAuditEvent({
        organizationId: context.organization.id,
        actorUserId: context.user.id,
        action: "membership.invite_delivery_deferred",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: {
          email: normalizedEmail,
          reason: "rate_limited",
        },
      });

      revalidatePath("/dashboard");

      return {
        status: "success",
        message: `Invitation saved for ${normalizedEmail}. Email delivery is currently rate-limited.`,
      };
    }

    await admin.from("invitations").delete().eq("id", invitation.id);

    return {
      status: "error",
      message: inviteError.message,
    };
  }

  await admin.from("invitations").update({ auth_user_id: invitedUser.user?.id ?? null }).eq("id", invitation.id);

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "membership.invite_sent",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: {
      email: normalizedEmail,
      role: parsed.data.role,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `Invitation sent to ${normalizedEmail}.`,
  };
}

export async function acceptInvite(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.user.email) {
    return {
      status: "error",
      message: "You need to sign in before accepting an invitation.",
    };
  }

  const parsed = acceptInviteSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invitation link is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: invitation, error } = await admin
    .from("invitations")
    .select("id, organization_id, email, role, status, expires_at")
    .eq("id", parsed.data.invitationId)
    .maybeSingle<{
      id: string;
      organization_id: string;
      email: string;
      role: "org_admin" | "compliance_manager" | "staff";
      status: string;
      expires_at: string;
    }>();

  if (error || !invitation) {
    return {
      status: "error",
      message: "Invitation was not found.",
    };
  }

  if (invitation.status !== "pending") {
    return {
      status: "error",
      message: "This invitation is no longer active.",
    };
  }

  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    await admin.from("invitations").update({ status: "expired" }).eq("id", invitation.id);

    return {
      status: "error",
      message: "This invitation has expired.",
    };
  }

  if (invitation.email !== context.user.email.toLowerCase()) {
    return {
      status: "error",
      message: "You must sign in with the invited email address.",
    };
  }

  const { data: existingMembership } = await admin
    .from("organization_memberships")
    .select("organization_id, status")
    .eq("user_id", context.user.id)
    .eq("status", "active")
    .maybeSingle<{ organization_id: string; status: string }>();

  if (existingMembership && existingMembership.organization_id !== invitation.organization_id) {
    return {
      status: "error",
      message: "This account is already attached to another active organization.",
    };
  }

  const { data: membership, error: membershipError } = await admin
    .from("organization_memberships")
    .upsert(
    {
      organization_id: invitation.organization_id,
      user_id: context.user.id,
      role: invitation.role,
      status: "active",
    },
    {
      onConflict: "user_id,organization_id",
    },
  )
    .select("id")
    .single<{ id: string }>();

  if (membershipError || !membership) {
    return {
      status: "error",
      message: membershipError?.message ?? "Unable to activate organization membership.",
    };
  }

  const { error: invitationUpdateError } = await admin
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      auth_user_id: context.user.id,
    })
    .eq("id", invitation.id);

  if (invitationUpdateError) {
    return {
      status: "error",
      message: invitationUpdateError.message,
    };
  }

  await logAuditEvent({
    organizationId: invitation.organization_id,
    actorUserId: context.user.id,
    action: "membership.invite_accepted",
    entityType: "invitation",
    entityId: invitation.id,
  });

  await logAuditEvent({
    organizationId: invitation.organization_id,
    actorUserId: context.user.id,
    action: "membership.activated",
    entityType: "membership",
    entityId: membership.id,
    metadata: {
      role: invitation.role,
    },
  });

  redirect("/dashboard");
}

export async function resendInvite(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "invite_users")) {
    return {
      status: "error",
      message: "You do not have permission to resend invitations.",
    };
  }

  const parsed = manageInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid invitation.",
    };
  }

  const admin = createAdminClient();
  const { data: invitation, error: invitationError } = await admin
    .from("invitations")
    .select("id, email, role, status")
    .eq("id", parsed.data.invitationId)
    .eq("organization_id", context.organization.id)
    .maybeSingle<{ id: string; email: string; role: "org_admin" | "compliance_manager" | "staff"; status: string }>();

  if (invitationError || !invitation) {
    return {
      status: "error",
      message: "Invitation was not found.",
    };
  }

  if (invitation.status !== "pending") {
    return {
      status: "error",
      message: "Only pending invitations can be resent.",
    };
  }

  const origin = await getRequestOrigin();
  const { data: invitedUser, error: inviteError } = await admin.auth.admin.inviteUserByEmail(invitation.email, {
    data: {
      invitationId: invitation.id,
      organizationId: context.organization.id,
      role: invitation.role,
    },
    redirectTo: invitationRedirect(origin, invitation.id),
  });

  if (inviteError) {
    if (isInviteRateLimitError(inviteError.message)) {
      await logAuditEvent({
        organizationId: context.organization.id,
        actorUserId: context.user.id,
        action: "membership.invite_delivery_deferred",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: {
          email: invitation.email,
          reason: "rate_limited",
        },
      });

      revalidatePath("/dashboard");

      return {
        status: "success",
        message: `Invitation remains pending for ${invitation.email}. Email delivery is currently rate-limited.`,
      };
    }

    return {
      status: "error",
      message: inviteError.message,
    };
  }

  const { error: updateError } = await admin
    .from("invitations")
    .update({
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invited_by: context.user.id,
      auth_user_id: invitedUser.user?.id ?? null,
    })
    .eq("id", invitation.id);

  if (updateError) {
    return {
      status: "error",
      message: updateError.message,
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "membership.invite_resent",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: {
      email: invitation.email,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `Invitation resent to ${invitation.email}.`,
  };
}

export async function revokeInvitation(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "invite_users")) {
    return {
      status: "error",
      message: "You do not have permission to revoke invitations.",
    };
  }

  const parsed = manageInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid invitation.",
    };
  }

  const admin = createAdminClient();
  const { data: invitation, error: invitationError } = await admin
    .from("invitations")
    .select("id, email, status")
    .eq("id", parsed.data.invitationId)
    .eq("organization_id", context.organization.id)
    .maybeSingle<{ id: string; email: string; status: string }>();

  if (invitationError || !invitation) {
    return {
      status: "error",
      message: "Invitation was not found.",
    };
  }

  if (invitation.status !== "pending") {
    return {
      status: "error",
      message: "Only pending invitations can be revoked.",
    };
  }

  const { error: revokeError } = await admin
    .from("invitations")
    .update({
      status: "revoked",
    })
    .eq("id", invitation.id);

  if (revokeError) {
    return {
      status: "error",
      message: revokeError.message,
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "membership.invite_revoked",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: {
      email: invitation.email,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `Invitation revoked for ${invitation.email}.`,
  };
}

export async function updateMemberRole(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_roles")) {
    return {
      status: "error",
      message: "You do not have permission to change roles.",
    };
  }

  const parsed = updateMemberRoleSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Invalid role update request.",
    };
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("organization_memberships")
    .select("id, user_id")
    .eq("id", parsed.data.membershipId)
    .eq("organization_id", context.organization.id)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!membership) {
    return {
      status: "error",
      message: "Membership was not found.",
    };
  }

  if (membership.user_id === context.user.id) {
    return {
      status: "error",
      message: "Use another admin account to change your own role.",
    };
  }

  await admin.from("organization_memberships").update({ role: parsed.data.role }).eq("id", membership.id);

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "membership.role_changed",
    entityType: "membership",
    entityId: membership.id,
    metadata: {
      role: parsed.data.role,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Role updated.",
  };
}

export async function revokeMembership(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_roles")) {
    return {
      status: "error",
      message: "You do not have permission to remove members.",
    };
  }

  const parsed = revokeMembershipSchema.safeParse({
    membershipId: formData.get("membershipId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Invalid membership revocation request.",
    };
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("organization_memberships")
    .select("id, user_id")
    .eq("id", parsed.data.membershipId)
    .eq("organization_id", context.organization.id)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!membership) {
    return {
      status: "error",
      message: "Membership was not found.",
    };
  }

  if (membership.user_id === context.user.id) {
    return {
      status: "error",
      message: "You cannot revoke your own active admin membership.",
    };
  }

  await admin.from("organization_memberships").update({ status: "revoked" }).eq("id", membership.id);

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "membership.revoked",
    entityType: "membership",
    entityId: membership.id,
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Member access revoked.",
  };
}
