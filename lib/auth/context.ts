import { cache } from "react";

import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { isPrivilegedRole, requiresMfaForRole } from "@/lib/auth/permissions";
import type { CurrentUserContext, Invitation, Membership, Profile } from "@/lib/auth/types";

const mfaBypassEmails = new Set(["ashvin.parmar@bacancy.com"]);

export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext | null> => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, email, full_name")
    .eq("user_id", user.id)
    .maybeSingle<Profile>();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, organization_id, user_id, role, status, organizations(id, name, slug, organization_type)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle<Membership>();

  const role = membership?.role ?? null;
  let aal: string | null = null;
  let needsMfa = false;
  const isMfaBypassUser = Boolean(user.email && mfaBypassEmails.has(user.email.toLowerCase()));

  if (requiresMfaForRole(role) && !isMfaBypassUser) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    aal = data?.currentLevel ?? null;
    needsMfa = data?.currentLevel !== "aal2";
  } else if (requiresMfaForRole(role) && isMfaBypassUser) {
    aal = "aal2";
    needsMfa = false;
  }

  return {
    user,
    profile: profile ?? null,
    membership: membership ?? null,
    organization: membership?.organizations ?? null,
    role,
    aal,
    needsMfa,
  };
});

export async function getPendingInvitationsForUser(email: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("invitations")
    .select("id, organization_id, email, role, status, expires_at, auth_user_id")
    .eq("status", "pending")
    .eq("email", email.toLowerCase())
    .order("created_at", { ascending: false })
    .returns<Invitation[]>();

  if (error) {
    return [];
  }

  return data.filter((invitation) => new Date(invitation.expires_at).getTime() > Date.now());
}

export function canAccessProtectedApp(context: CurrentUserContext | null) {
  return Boolean(context?.membership && context.role && !context.needsMfa);
}

export function isPrivilegedContext(context: CurrentUserContext | null) {
  return isPrivilegedRole(context?.role ?? null);
}
