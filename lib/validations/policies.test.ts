import { createSecurityPolicySchema, updateSecurityPolicyStatusSchema } from "@/lib/validations/policies";

describe("security policy validations", () => {
  it("accepts valid security policy payload", () => {
    const parsed = createSecurityPolicySchema.safeParse({
      policyName: "Access Control Standard",
      category: "Identity",
      version: "2.1",
      status: "active",
      effectiveDate: "2026-04-01",
      nextReviewDate: "2027-04-01",
      documentUrl: "https://example.com/policies/access-control",
      summary: "Defines least privilege and quarterly access certification controls.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid status updates", () => {
    const parsed = updateSecurityPolicyStatusSchema.safeParse({
      policyId: "bad-id",
      status: "approved",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects review date earlier than effective date", () => {
    const parsed = createSecurityPolicySchema.safeParse({
      policyName: "Encryption Policy",
      category: "Data Protection",
      version: "1.0",
      status: "draft",
      effectiveDate: "2026-06-01",
      nextReviewDate: "2026-05-01",
    });

    expect(parsed.success).toBe(false);
  });
});

