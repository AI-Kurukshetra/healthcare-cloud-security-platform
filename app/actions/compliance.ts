"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import type { FormState } from "@/lib/forms/form-state";
import { createAdminClient } from "@/lib/supabase/server";
import {
  createComplianceControlSchema,
  updateComplianceControlStatusSchema,
} from "@/lib/validations/compliance";

export async function createComplianceControl(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !context.membership || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to create controls.",
    };
  }

  const parsed = createComplianceControlSchema.safeParse({
    controlCode: formData.get("controlCode"),
    title: formData.get("title"),
    category: formData.get("category"),
    dueDate: formData.get("dueDate"),
    evidenceSummary: formData.get("evidenceSummary"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Control details are invalid.",
    };
  }

  const admin = createAdminClient();
  const controlCode = parsed.data.controlCode.toUpperCase();
  const { data: control, error } = await admin
    .from("compliance_controls")
    .insert({
      organization_id: context.organization.id,
      control_code: controlCode,
      title: parsed.data.title,
      category: parsed.data.category,
      due_date: parsed.data.dueDate ?? null,
      owner_membership_id: context.membership.id,
      evidence_summary: parsed.data.evidenceSummary ?? null,
      notes: parsed.data.notes ?? null,
      created_by: context.user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !control) {
    return {
      status: "error",
      message: error?.message ?? "Unable to create control.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "compliance.control_created",
    entityType: "compliance_control",
    entityId: control.id,
    metadata: {
      controlCode,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${controlCode} created.`,
  };
}

export async function updateComplianceControlStatus(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to update controls.",
    };
  }

  const parsed = updateComplianceControlStatusSchema.safeParse({
    controlId: formData.get("controlId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Control update request is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: control, error } = await admin
    .from("compliance_controls")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.controlId)
    .eq("organization_id", context.organization.id)
    .select("id, control_code")
    .maybeSingle<{ id: string; control_code: string }>();

  if (error || !control) {
    return {
      status: "error",
      message: error?.message ?? "Control was not found.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "compliance.control_status_updated",
    entityType: "compliance_control",
    entityId: control.id,
    metadata: {
      controlCode: control.control_code,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${control.control_code} updated.`,
  };
}
