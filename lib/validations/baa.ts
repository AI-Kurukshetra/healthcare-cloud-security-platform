import { z } from "zod";

export const baaStatuses = ["draft", "under_review", "active", "expired", "terminated"] as const;

export type BaaStatus = (typeof baaStatuses)[number];

export const createBaaSchema = z.object({
  vendorName: z.string().trim().min(3, "Vendor name must be at least 3 characters."),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid contact email."),
  status: z.enum(baaStatuses),
  signedAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Signed date must be a valid date."),
  renewalDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Renewal date must be a valid date."),
  documentUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().url().safeParse(value).success, "Document URL must be valid."),
  notes: z
    .string()
    .trim()
    .max(1200, "Notes must be 1200 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
}).superRefine((value, ctx) => {
  if (!value.signedAt || !value.renewalDate) {
    return;
  }

  const signedAt = new Date(value.signedAt).getTime();
  const renewalDate = new Date(value.renewalDate).getTime();
  if (Number.isNaN(signedAt) || Number.isNaN(renewalDate)) {
    return;
  }

  if (renewalDate < signedAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["renewalDate"],
      message: "Renewal date cannot be earlier than signed date.",
    });
  }
});

export const updateBaaStatusSchema = z.object({
  baaId: z.string().uuid(),
  status: z.enum(baaStatuses),
});
