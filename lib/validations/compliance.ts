import { z } from "zod";

export const complianceControlStatuses = [
  "not_started",
  "in_progress",
  "needs_review",
  "compliant",
  "at_risk",
] as const;

export type ComplianceControlStatus = (typeof complianceControlStatuses)[number];

export const createComplianceControlSchema = z.object({
  controlCode: z
    .string()
    .trim()
    .min(3, "Control code must be at least 3 characters.")
    .max(32, "Control code must be 32 characters or fewer."),
  title: z.string().trim().min(5, "Control title must be at least 5 characters."),
  category: z.string().trim().min(3, "Category must be at least 3 characters."),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Due date must be a valid date."),
  evidenceSummary: z
    .string()
    .trim()
    .max(400, "Evidence summary must be 400 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes must be 1000 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
});

export const updateComplianceControlStatusSchema = z.object({
  controlId: z.string().uuid(),
  status: z.enum(complianceControlStatuses),
});
