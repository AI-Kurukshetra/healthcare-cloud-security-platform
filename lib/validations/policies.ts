import { z } from "zod";

export const securityPolicyStatuses = ["draft", "active", "needs_review", "retired"] as const;

export type SecurityPolicyStatus = (typeof securityPolicyStatuses)[number];

export const createSecurityPolicySchema = z
  .object({
    policyName: z.string().trim().min(4, "Policy name must be at least 4 characters."),
    category: z.string().trim().min(3, "Category must be at least 3 characters."),
    version: z.string().trim().min(1, "Version is required.").max(20, "Version must be 20 characters or fewer."),
    status: z.enum(securityPolicyStatuses),
    effectiveDate: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined)
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Effective date must be a valid date."),
    nextReviewDate: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined)
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Next review date must be a valid date."),
    documentUrl: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined)
      .refine((value) => !value || z.string().url().safeParse(value).success, "Document URL must be valid."),
    summary: z
      .string()
      .trim()
      .max(1200, "Summary must be 1200 characters or fewer.")
      .optional()
      .transform((value) => value || undefined),
  })
  .superRefine((value, ctx) => {
    if (!value.effectiveDate || !value.nextReviewDate) {
      return;
    }

    const effectiveDate = new Date(value.effectiveDate).getTime();
    const nextReviewDate = new Date(value.nextReviewDate).getTime();
    if (Number.isNaN(effectiveDate) || Number.isNaN(nextReviewDate)) {
      return;
    }

    if (nextReviewDate < effectiveDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nextReviewDate"],
        message: "Next review date cannot be earlier than effective date.",
      });
    }
  });

export const updateSecurityPolicyStatusSchema = z.object({
  policyId: z.string().uuid(),
  status: z.enum(securityPolicyStatuses),
});

