import { createIncidentSchema, updateIncidentStatusSchema } from "@/lib/validations/incidents";

describe("incident validations", () => {
  it("accepts a valid incident payload", () => {
    const parsed = createIncidentSchema.safeParse({
      title: "Unexpected PHI export activity",
      severity: "high",
      affectedSystem: "EHR integration",
      summary: "Outbound export volume spiked outside the normal operating window.",
      responseNotes: "Initial review assigned to compliance manager.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid incident status updates", () => {
    const parsed = updateIncidentStatusSchema.safeParse({
      incidentId: "not-a-uuid",
      status: "triaged",
    });

    expect(parsed.success).toBe(false);
  });
});
