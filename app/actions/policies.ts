"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import type { FormState } from "@/lib/forms/form-state";
import { createAdminClient } from "@/lib/supabase/server";
import { createSecurityPolicySchema, updateSecurityPolicyStatusSchema } from "@/lib/validations/policies";

export async function createSecurityPolicy(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !context.membership || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to create security policies.",
    };
  }

  const parsed = createSecurityPolicySchema.safeParse({
    policyName: formData.get("policyName"),
    category: formData.get("category"),
    version: formData.get("version"),
    status: formData.get("status"),
    effectiveDate: formData.get("effectiveDate"),
    nextReviewDate: formData.get("nextReviewDate"),
    documentUrl: formData.get("documentUrl"),
    summary: formData.get("summary"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Policy details are invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: policy, error } = await admin
    .from("security_policies")
    .insert({
      organization_id: context.organization.id,
      policy_name: parsed.data.policyName,
      category: parsed.data.category,
      version: parsed.data.version,
      status: parsed.data.status,
      effective_date: parsed.data.effectiveDate ?? null,
      next_review_date: parsed.data.nextReviewDate ?? null,
      document_url: parsed.data.documentUrl ?? null,
      summary: parsed.data.summary ?? null,
      owner_membership_id: context.membership.id,
      created_by: context.user.id,
    })
    .select("id, policy_name, version")
    .single<{ id: string; policy_name: string; version: string }>();

  if (error || !policy) {
    return {
      status: "error",
      message: error?.message ?? "Unable to create security policy.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "policy.created",
    entityType: "security_policy",
    entityId: policy.id,
    metadata: {
      policyName: policy.policy_name,
      version: policy.version,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${policy.policy_name} v${policy.version} created.`,
  };
}

export async function updateSecurityPolicyStatus(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to update security policies.",
    };
  }

  const parsed = updateSecurityPolicyStatusSchema.safeParse({
    policyId: formData.get("policyId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Policy status update is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: policy, error } = await admin
    .from("security_policies")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.policyId)
    .eq("organization_id", context.organization.id)
    .select("id, policy_name, version")
    .maybeSingle<{ id: string; policy_name: string; version: string }>();

  if (error || !policy) {
    return {
      status: "error",
      message: error?.message ?? "Policy was not found.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "policy.status_updated",
    entityType: "security_policy",
    entityId: policy.id,
    metadata: {
      policyName: policy.policy_name,
      version: policy.version,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${policy.policy_name} updated.`,
  };
}

