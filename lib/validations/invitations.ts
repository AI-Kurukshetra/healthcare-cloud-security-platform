import { z } from "zod";

import { appRoles } from "@/lib/auth/permissions";

export const inviteUserSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  role: z.enum(appRoles),
});

export const acceptInviteSchema = z.object({
  invitationId: z.string().uuid("Invitation link is invalid."),
});

export const manageInvitationSchema = z.object({
  invitationId: z.string().uuid("Invitation identifier is invalid."),
});

export const updateMemberRoleSchema = z.object({
  membershipId: z.string().uuid(),
  role: z.enum(appRoles),
});

export const revokeMembershipSchema = z.object({
  membershipId: z.string().uuid(),
});
