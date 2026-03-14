import { can, requiresMfaForRole } from "@/lib/auth/permissions";

describe("permissions", () => {
  it("grants org admins full management access", () => {
    expect(can("org_admin", "invite_users")).toBe(true);
    expect(can("org_admin", "manage_roles")).toBe(true);
    expect(can("org_admin", "view_audit_logs")).toBe(true);
  });

  it("restricts compliance managers from role and org management", () => {
    expect(can("compliance_manager", "manage_compliance")).toBe(true);
    expect(can("compliance_manager", "view_team_roster")).toBe(true);
    expect(can("compliance_manager", "manage_roles")).toBe(false);
    expect(can("compliance_manager", "invite_users")).toBe(false);
  });

  it("keeps staff on the minimal access path", () => {
    expect(can("staff", "view_team_roster")).toBe(false);
    expect(can("staff", "manage_incidents")).toBe(false);
  });

  it("requires mfa for privileged roles only", () => {
    expect(requiresMfaForRole("org_admin")).toBe(true);
    expect(requiresMfaForRole("compliance_manager")).toBe(true);
    expect(requiresMfaForRole("staff")).toBe(false);
    expect(requiresMfaForRole(null)).toBe(false);
  });
});
