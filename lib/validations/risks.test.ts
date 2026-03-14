import { createRiskAssessmentSchema, updateRiskAssessmentStatusSchema } from "@/lib/validations/risks";

describe("risk validations", () => {
  it("accepts a valid risk assessment payload", () => {
    const parsed = createRiskAssessmentSchema.safeParse({
      title: "Unreviewed cloud storage permissions",
      category: "Access management",
      likelihood: 4,
      impact: 5,
      mitigationPlan: "Apply role-based access review and quarterly attestations.",
      targetDate: "2026-05-15",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid risk status updates", () => {
    const parsed = updateRiskAssessmentStatusSchema.safeParse({
      riskId: "bad-id",
      status: "open",
    });

    expect(parsed.success).toBe(false);
  });
});
