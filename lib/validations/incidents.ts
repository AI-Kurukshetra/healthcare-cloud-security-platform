import { z } from "zod";

export const incidentSeverities = ["low", "medium", "high", "critical"] as const;
export const incidentStatuses = ["open", "investigating", "contained", "resolved", "closed"] as const;

export type IncidentSeverity = (typeof incidentSeverities)[number];
export type IncidentStatus = (typeof incidentStatuses)[number];

export const createIncidentSchema = z.object({
  title: z.string().trim().min(5, "Incident title must be at least 5 characters."),
  severity: z.enum(incidentSeverities),
  affectedSystem: z
    .string()
    .trim()
    .max(120, "Affected system must be 120 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
  summary: z.string().trim().min(10, "Incident summary must be at least 10 characters."),
  responseNotes: z
    .string()
    .trim()
    .max(1200, "Response notes must be 1200 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
});

export const updateIncidentStatusSchema = z.object({
  incidentId: z.string().uuid(),
  status: z.enum(incidentStatuses),
});
