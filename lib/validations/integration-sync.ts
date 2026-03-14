import { z } from "zod";

import { ehrProviders } from "@/lib/validations/integrations";

export const integrationSyncTriggers = ["manual", "scheduled", "retry"] as const;

export const integrationSyncRequestSchema = z.object({
  organizationSlug: z.string().trim().min(3, "Organization slug is required."),
  provider: z.enum(ehrProviders),
  dryRun: z.coerce.boolean().optional().default(false),
  trigger: z.enum(integrationSyncTriggers).default("manual"),
  requestedAt: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Requested time must be a valid timestamp."),
  telemetry: z
    .object({
      expectedRecords: z.number().int().min(0).optional(),
      sourceUpdatedAfter: z
        .string()
        .trim()
        .optional()
        .refine(
          (value) => !value || !Number.isNaN(Date.parse(value)),
          "Telemetry sourceUpdatedAfter must be a valid timestamp.",
        ),
      connectorVersion: z.string().trim().max(80).optional(),
    })
    .optional(),
});

export type IntegrationSyncRequest = z.infer<typeof integrationSyncRequestSchema>;
