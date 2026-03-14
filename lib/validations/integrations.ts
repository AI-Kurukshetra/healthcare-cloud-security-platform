import { z } from "zod";

export const ehrProviders = ["athenahealth", "epic", "cerner", "other"] as const;
export const integrationModes = ["sandbox", "production"] as const;
export const integrationStatuses = ["not_connected", "connected", "syncing", "error", "paused"] as const;

export type EhrProvider = (typeof ehrProviders)[number];
export type IntegrationMode = (typeof integrationModes)[number];
export type IntegrationStatus = (typeof integrationStatuses)[number];

export const createEhrIntegrationSchema = z.object({
  provider: z.enum(ehrProviders),
  mode: z.enum(integrationModes),
  status: z.enum(integrationStatuses),
  externalTenantId: z
    .string()
    .trim()
    .max(120, "External tenant ID must be 120 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
  syncFrequencyMinutes: z.coerce
    .number()
    .int("Sync frequency must be a whole number.")
    .min(15, "Sync frequency must be between 15 and 1440 minutes.")
    .max(1440, "Sync frequency must be between 15 and 1440 minutes."),
  lastSyncAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Last sync time must be valid."),
  notes: z
    .string()
    .trim()
    .max(1200, "Notes must be 1200 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
});

export const updateEhrIntegrationStatusSchema = z.object({
  integrationId: z.string().uuid(),
  status: z.enum(integrationStatuses),
  lastSyncAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Last sync time must be valid."),
});

