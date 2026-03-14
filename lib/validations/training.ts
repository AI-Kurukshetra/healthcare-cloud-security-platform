import { z } from "zod";

export const trainingRecordStatuses = ["not_started", "in_progress", "completed", "overdue"] as const;

export type TrainingRecordStatus = (typeof trainingRecordStatuses)[number];

export const createTrainingRecordSchema = z.object({
  title: z.string().trim().min(5, "Training title must be at least 5 characters."),
  description: z
    .string()
    .trim()
    .max(1200, "Description must be 1200 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
  assignedUserId: z.string().uuid("Select a valid assignee."),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Due date must be a valid date."),
});

export const updateTrainingRecordStatusSchema = z.object({
  trainingRecordId: z.string().uuid(),
  status: z.enum(trainingRecordStatuses),
  completionNotes: z
    .string()
    .trim()
    .max(1200, "Completion notes must be 1200 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
});

