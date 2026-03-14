export const appRoles = ["org_admin", "compliance_manager", "staff"] as const;
export const membershipStatuses = ["invited", "active", "revoked"] as const;
export const invitationStatuses = ["pending", "accepted", "revoked", "expired"] as const;

export type AppRole = (typeof appRoles)[number];
export type MembershipStatus = (typeof membershipStatuses)[number];
export type InvitationStatus = (typeof invitationStatuses)[number];

export const permissions = [
  "manage_organization",
  "invite_users",
  "manage_roles",
  "view_audit_logs",
  "manage_compliance",
  "manage_incidents",
  "view_reports",
  "view_team_roster",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<AppRole, readonly Permission[]> = {
  org_admin: permissions,
  compliance_manager: [
    "invite_users",
    "manage_roles",
    "view_audit_logs",
    "manage_compliance",
    "manage_incidents",
    "view_reports",
    "view_team_roster",
  ],
  staff: [],
};

export function isAppRole(value: string): value is AppRole {
  return appRoles.includes(value as AppRole);
}

export function can(role: AppRole | null, permission: Permission) {
  if (!role) {
    return false;
  }

  return rolePermissions[role].includes(permission);
}

export function isPrivilegedRole(role: AppRole | null) {
  return role === "org_admin" || role === "compliance_manager";
}

export function requiresMfaForRole(role: AppRole | null) {
  return isPrivilegedRole(role);
}
