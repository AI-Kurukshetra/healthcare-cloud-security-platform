import { z } from "zod";

export const riskAssessmentStatuses = ["identified", "mitigating", "accepted", "closed"] as const;

export type RiskAssessmentStatus = (typeof riskAssessmentStatuses)[number];

export const createRiskAssessmentSchema = z.object({
  title: z.string().trim().min(5, "Risk title must be at least 5 characters."),
  category: z.string().trim().min(3, "Category must be at least 3 characters."),
  likelihood: z.coerce
    .number()
    .int("Likelihood must be a whole number.")
    .min(1, "Likelihood must be between 1 and 5.")
    .max(5, "Likelihood must be between 1 and 5."),
  impact: z.coerce
    .number()
    .int("Impact must be a whole number.")
    .min(1, "Impact must be between 1 and 5.")
    .max(5, "Impact must be between 1 and 5."),
  mitigationPlan: z
    .string()
    .trim()
    .max(1200, "Mitigation plan must be 1200 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
  targetDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Target date must be a valid date."),
});

export const updateRiskAssessmentStatusSchema = z.object({
  riskId: z.string().uuid(),
  status: z.enum(riskAssessmentStatuses),
});
