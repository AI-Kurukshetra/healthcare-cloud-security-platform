import { createBackupRecordSchema, updateBackupRecordStatusSchema } from "@/lib/validations/backup";

describe("backup validations", () => {
  it("accepts a valid backup record payload", () => {
    const parsed = createBackupRecordSchema.safeParse({
      systemName: "Primary EHR Database",
      backupScope: "Daily full backup",
      status: "scheduled",
      lastSuccessAt: "2026-03-14T00:30:00.000Z",
      nextScheduledAt: "2026-03-15T00:30:00.000Z",
      retentionDays: 35,
      notes: "Encrypted snapshots stored in secondary region.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid backup status updates", () => {
    const parsed = updateBackupRecordStatusSchema.safeParse({
      backupId: "bad-id",
      status: "done",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects next schedule earlier than last success", () => {
    const parsed = createBackupRecordSchema.safeParse({
      systemName: "Primary EHR Database",
      backupScope: "Daily full backup",
      status: "scheduled",
      lastSuccessAt: "2026-03-15T00:30:00.000Z",
      nextScheduledAt: "2026-03-14T00:30:00.000Z",
      retentionDays: 35,
    });

    expect(parsed.success).toBe(false);
  });
});
