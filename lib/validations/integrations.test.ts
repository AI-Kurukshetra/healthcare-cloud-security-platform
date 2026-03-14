import { createEhrIntegrationSchema, updateEhrIntegrationStatusSchema } from "@/lib/validations/integrations";

describe("integration validations", () => {
  it("accepts valid EHR integration payload", () => {
    const parsed = createEhrIntegrationSchema.safeParse({
      provider: "athenahealth",
      mode: "sandbox",
      status: "connected",
      externalTenantId: "tenant-42",
      syncFrequencyMinutes: 60,
      lastSyncAt: "2026-03-14T09:00:00.000Z",
      notes: "Initial sandbox connector validation completed.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid integration status updates", () => {
    const parsed = updateEhrIntegrationStatusSchema.safeParse({
      integrationId: "bad-id",
      status: "ready",
    });

    expect(parsed.success).toBe(false);
  });
});

