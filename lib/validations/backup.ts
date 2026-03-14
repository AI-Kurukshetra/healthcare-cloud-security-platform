import { z } from "zod";

export const backupRecordStatuses = ["scheduled", "running", "successful", "failed", "paused"] as const;

export type BackupRecordStatus = (typeof backupRecordStatuses)[number];

export const createBackupRecordSchema = z.object({
  systemName: z.string().trim().min(3, "System name must be at least 3 characters."),
  backupScope: z.string().trim().min(3, "Backup scope must be at least 3 characters."),
  status: z.enum(backupRecordStatuses),
  lastSuccessAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Last success time must be valid."),
  nextScheduledAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Next scheduled time must be valid."),
  retentionDays: z.coerce
    .number()
    .int("Retention must be a whole number.")
    .min(1, "Retention must be between 1 and 3650 days.")
    .max(3650, "Retention must be between 1 and 3650 days."),
  notes: z
    .string()
    .trim()
    .max(1200, "Notes must be 1200 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
}).superRefine((value, ctx) => {
  if (!value.lastSuccessAt || !value.nextScheduledAt) {
    return;
  }

  const lastSuccessAt = new Date(value.lastSuccessAt).getTime();
  const nextScheduledAt = new Date(value.nextScheduledAt).getTime();
  if (Number.isNaN(lastSuccessAt) || Number.isNaN(nextScheduledAt)) {
    return;
  }

  if (nextScheduledAt < lastSuccessAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nextScheduledAt"],
      message: "Next scheduled time cannot be earlier than last successful backup time.",
    });
  }
});

export const updateBackupRecordStatusSchema = z.object({
  backupId: z.string().uuid(),
  status: z.enum(backupRecordStatuses),
});
