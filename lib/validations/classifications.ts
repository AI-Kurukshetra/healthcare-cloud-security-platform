import { z } from "zod";

export const dataClassificationLevels = ["public", "internal", "confidential", "phi_restricted"] as const;

export type DataClassificationLevel = (typeof dataClassificationLevels)[number];

export const createDataClassificationSchema = z.object({
  assetName: z.string().trim().min(3, "Asset name must be at least 3 characters."),
  dataType: z.string().trim().min(3, "Data type must be at least 3 characters."),
  classificationLevel: z.enum(dataClassificationLevels),
  containsPhi: z.coerce.boolean(),
  containsPii: z.coerce.boolean(),
  encryptionRequired: z.coerce.boolean(),
  retentionDays: z
    .union([z.coerce.number().int("Retention must be a whole number."), z.literal("")])
    .transform((value) => (value === "" ? undefined : value))
    .refine((value) => value === undefined || (value >= 1 && value <= 3650), "Retention must be between 1 and 3650 days."),
  notes: z
    .string()
    .trim()
    .max(1200, "Notes must be 1200 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
});

export const updateDataClassificationLevelSchema = z.object({
  classificationId: z.string().uuid(),
  classificationLevel: z.enum(dataClassificationLevels),
  encryptionRequired: z.coerce.boolean(),
});

