import { createBaaSchema, updateBaaStatusSchema } from "@/lib/validations/baa";

describe("baa validations", () => {
  it("accepts valid baa payload", () => {
    const parsed = createBaaSchema.safeParse({
      vendorName: "Acme EHR Services",
      contactEmail: "security@acme-ehr.com",
      status: "active",
      signedAt: "2026-03-14",
      renewalDate: "2027-03-14",
      documentUrl: "https://example.com/baa/acme",
      notes: "Annual legal review complete.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid baa status update", () => {
    const parsed = updateBaaStatusSchema.safeParse({
      baaId: "bad-id",
      status: "signed",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects renewal date earlier than signed date", () => {
    const parsed = createBaaSchema.safeParse({
      vendorName: "Acme EHR Services",
      contactEmail: "security@acme-ehr.com",
      status: "active",
      signedAt: "2026-03-14",
      renewalDate: "2026-03-01",
    });

    expect(parsed.success).toBe(false);
  });
});
