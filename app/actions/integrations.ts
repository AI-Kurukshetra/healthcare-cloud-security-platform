"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import type { FormState } from "@/lib/forms/form-state";
import { createAdminClient } from "@/lib/supabase/server";
import { createEhrIntegrationSchema, updateEhrIntegrationStatusSchema } from "@/lib/validations/integrations";

export async function createEhrIntegration(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !context.membership || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to create integrations.",
    };
  }

  const parsed = createEhrIntegrationSchema.safeParse({
    provider: formData.get("provider"),
    mode: formData.get("mode"),
    status: formData.get("status"),
    externalTenantId: formData.get("externalTenantId"),
    syncFrequencyMinutes: formData.get("syncFrequencyMinutes"),
    lastSyncAt: formData.get("lastSyncAt"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Integration details are invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("ehr_integrations")
    .upsert(
      {
        organization_id: context.organization.id,
        provider: parsed.data.provider,
        mode: parsed.data.mode,
        status: parsed.data.status,
        external_tenant_id: parsed.data.externalTenantId ?? null,
        sync_frequency_minutes: parsed.data.syncFrequencyMinutes,
        last_sync_at: parsed.data.lastSyncAt ?? null,
        notes: parsed.data.notes ?? null,
        owner_membership_id: context.membership.id,
        created_by: context.user.id,
      },
      {
        onConflict: "organization_id,provider",
      },
    )
    .select("id, provider")
    .single<{ id: string; provider: string }>();

  if (error || !integration) {
    return {
      status: "error",
      message: error?.message ?? "Unable to save integration.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "integration.created",
    entityType: "ehr_integration",
    entityId: integration.id,
    metadata: {
      provider: integration.provider,
      status: parsed.data.status,
      mode: parsed.data.mode,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${integration.provider} integration saved.`,
  };
}

export async function updateEhrIntegrationStatus(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to update integrations.",
    };
  }

  const parsed = updateEhrIntegrationStatusSchema.safeParse({
    integrationId: formData.get("integrationId"),
    status: formData.get("status"),
    lastSyncAt: formData.get("lastSyncAt"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Integration status update is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("ehr_integrations")
    .update({
      status: parsed.data.status,
      last_sync_at: parsed.data.lastSyncAt ?? null,
    })
    .eq("id", parsed.data.integrationId)
    .eq("organization_id", context.organization.id)
    .select("id, provider")
    .maybeSingle<{ id: string; provider: string }>();

  if (error || !integration) {
    return {
      status: "error",
      message: error?.message ?? "Integration was not found.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "integration.status_updated",
    entityType: "ehr_integration",
    entityId: integration.id,
    metadata: {
      provider: integration.provider,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${integration.provider} integration updated.`,
  };
}

