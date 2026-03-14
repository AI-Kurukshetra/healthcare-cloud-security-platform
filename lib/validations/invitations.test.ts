import {
  acceptInviteSchema,
  inviteUserSchema,
  manageInvitationSchema,
  revokeMembershipSchema,
  updateMemberRoleSchema,
} from "@/lib/validations/invitations";

describe("invitation validations", () => {
  it("accepts a valid invite payload", () => {
    expect(
      inviteUserSchema.safeParse({
        email: "security@example.com",
        role: "compliance_manager",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid role", () => {
    expect(
      inviteUserSchema.safeParse({
        email: "security@example.com",
        role: "super_admin",
      }).success,
    ).toBe(false);
  });

  it("validates invitation and membership identifiers", () => {
    const id = "3e4666bf-d5e5-4aa7-b8ce-cefe41c7568a";

    expect(acceptInviteSchema.safeParse({ invitationId: id }).success).toBe(true);
    expect(manageInvitationSchema.safeParse({ invitationId: id }).success).toBe(true);
    expect(updateMemberRoleSchema.safeParse({ membershipId: id, role: "staff" }).success).toBe(true);
    expect(revokeMembershipSchema.safeParse({ membershipId: "bad-id" }).success).toBe(false);
  });
});
