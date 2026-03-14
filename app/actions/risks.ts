"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import type { FormState } from "@/lib/forms/form-state";
import { createAdminClient } from "@/lib/supabase/server";
import { createRiskAssessmentSchema, updateRiskAssessmentStatusSchema } from "@/lib/validations/risks";

export async function createRiskAssessment(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !context.membership || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to create risks.",
    };
  }

  const parsed = createRiskAssessmentSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    likelihood: formData.get("likelihood"),
    impact: formData.get("impact"),
    mitigationPlan: formData.get("mitigationPlan"),
    targetDate: formData.get("targetDate"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Risk details are invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: risk, error } = await admin
    .from("risk_assessments")
    .insert({
      organization_id: context.organization.id,
      title: parsed.data.title,
      category: parsed.data.category,
      likelihood: parsed.data.likelihood,
      impact: parsed.data.impact,
      owner_membership_id: context.membership.id,
      mitigation_plan: parsed.data.mitigationPlan ?? null,
      target_date: parsed.data.targetDate ?? null,
      created_by: context.user.id,
    })
    .select("id, risk_score")
    .single<{ id: string; risk_score: number }>();

  if (error || !risk) {
    return {
      status: "error",
      message: error?.message ?? "Unable to create risk.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "risk.created",
    entityType: "risk_assessment",
    entityId: risk.id,
    metadata: {
      riskScore: risk.risk_score,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Risk added to register.",
  };
}

export async function updateRiskAssessmentStatus(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to update risks.",
    };
  }

  const parsed = updateRiskAssessmentStatusSchema.safeParse({
    riskId: formData.get("riskId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Risk update request is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: risk, error } = await admin
    .from("risk_assessments")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.riskId)
    .eq("organization_id", context.organization.id)
    .select("id, title")
    .maybeSingle<{ id: string; title: string }>();

  if (error || !risk) {
    return {
      status: "error",
      message: error?.message ?? "Risk was not found.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "risk.status_updated",
    entityType: "risk_assessment",
    entityId: risk.id,
    metadata: {
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${risk.title} updated.`,
  };
}
