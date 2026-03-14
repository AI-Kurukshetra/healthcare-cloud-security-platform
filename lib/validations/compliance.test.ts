import {
  createComplianceControlSchema,
  updateComplianceControlStatusSchema,
} from "@/lib/validations/compliance";

describe("compliance validations", () => {
  it("accepts a valid compliance control payload", () => {
    const parsed = createComplianceControlSchema.safeParse({
      controlCode: "164.308(a)(1)",
      title: "Security management process",
      category: "Administrative safeguards",
      dueDate: "2026-04-01",
      evidenceSummary: "Policy document reviewed.",
      notes: "Assigned to compliance for April audit prep.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid control status updates", () => {
    const parsed = updateComplianceControlStatusSchema.safeParse({
      controlId: "not-a-uuid",
      status: "done",
    });

    expect(parsed.success).toBe(false);
  });
});
