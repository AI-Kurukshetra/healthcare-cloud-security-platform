import { integrationSyncRequestSchema } from "@/lib/validations/integration-sync";

describe("integration sync request validation", () => {
  it("accepts valid sync payload", () => {
    const parsed = integrationSyncRequestSchema.safeParse({
      organizationSlug: "e2e-security-ops",
      provider: "athenahealth",
      trigger: "scheduled",
      dryRun: false,
      requestedAt: "2026-03-14T10:00:00.000Z",
      telemetry: {
        expectedRecords: 120,
        sourceUpdatedAfter: "2026-03-14T09:45:00.000Z",
        connectorVersion: "1.2.0",
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid provider", () => {
    const parsed = integrationSyncRequestSchema.safeParse({
      organizationSlug: "e2e-security-ops",
      provider: "unknown",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid telemetry timestamp", () => {
    const parsed = integrationSyncRequestSchema.safeParse({
      organizationSlug: "e2e-security-ops",
      provider: "epic",
      telemetry: {
        sourceUpdatedAfter: "not-a-date",
      },
    });

    expect(parsed.success).toBe(false);
  });
});
