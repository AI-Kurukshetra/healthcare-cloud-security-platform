"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import type { FormState } from "@/lib/forms/form-state";
import { createAdminClient } from "@/lib/supabase/server";
import { createIncidentSchema, updateIncidentStatusSchema } from "@/lib/validations/incidents";

export async function createIncident(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !context.membership || !can(context.role, "manage_incidents")) {
    return {
      status: "error",
      message: "You do not have permission to create incidents.",
    };
  }

  const parsed = createIncidentSchema.safeParse({
    title: formData.get("title"),
    severity: formData.get("severity"),
    affectedSystem: formData.get("affectedSystem"),
    summary: formData.get("summary"),
    responseNotes: formData.get("responseNotes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Incident details are invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: incident, error } = await admin
    .from("incident_reports")
    .insert({
      organization_id: context.organization.id,
      title: parsed.data.title,
      severity: parsed.data.severity,
      owner_membership_id: context.membership.id,
      affected_system: parsed.data.affectedSystem ?? null,
      summary: parsed.data.summary,
      response_notes: parsed.data.responseNotes ?? null,
      created_by: context.user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !incident) {
    return {
      status: "error",
      message: error?.message ?? "Unable to create incident.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "incident.created",
    entityType: "incident",
    entityId: incident.id,
    metadata: {
      severity: parsed.data.severity,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Incident logged.",
  };
}

export async function updateIncidentStatus(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_incidents")) {
    return {
      status: "error",
      message: "You do not have permission to update incidents.",
    };
  }

  const parsed = updateIncidentStatusSchema.safeParse({
    incidentId: formData.get("incidentId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Incident update request is invalid.",
    };
  }

  const admin = createAdminClient();
  const resolvedAt =
    parsed.data.status === "resolved" || parsed.data.status === "closed" ? new Date().toISOString() : null;
  const { data: incident, error } = await admin
    .from("incident_reports")
    .update({
      status: parsed.data.status,
      resolved_at: resolvedAt,
    })
    .eq("id", parsed.data.incidentId)
    .eq("organization_id", context.organization.id)
    .select("id, title")
    .maybeSingle<{ id: string; title: string }>();

  if (error || !incident) {
    return {
      status: "error",
      message: error?.message ?? "Incident was not found.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "incident.status_updated",
    entityType: "incident",
    entityId: incident.id,
    metadata: {
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${incident.title} updated.`,
  };
}
