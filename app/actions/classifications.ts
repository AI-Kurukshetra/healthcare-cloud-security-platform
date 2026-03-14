"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import type { FormState } from "@/lib/forms/form-state";
import { createAdminClient } from "@/lib/supabase/server";
import { createDataClassificationSchema, updateDataClassificationLevelSchema } from "@/lib/validations/classifications";

export async function createDataClassification(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !context.membership || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to create data classifications.",
    };
  }

  const parsed = createDataClassificationSchema.safeParse({
    assetName: formData.get("assetName"),
    dataType: formData.get("dataType"),
    classificationLevel: formData.get("classificationLevel"),
    containsPhi: formData.get("containsPhi"),
    containsPii: formData.get("containsPii"),
    encryptionRequired: formData.get("encryptionRequired"),
    retentionDays: formData.get("retentionDays"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Classification details are invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: classification, error } = await admin
    .from("data_classifications")
    .insert({
      organization_id: context.organization.id,
      asset_name: parsed.data.assetName,
      data_type: parsed.data.dataType,
      classification_level: parsed.data.classificationLevel,
      contains_phi: parsed.data.containsPhi,
      contains_pii: parsed.data.containsPii,
      encryption_required: parsed.data.encryptionRequired,
      retention_days: parsed.data.retentionDays ?? null,
      notes: parsed.data.notes ?? null,
      owner_membership_id: context.membership.id,
      created_by: context.user.id,
    })
    .select("id, asset_name")
    .single<{ id: string; asset_name: string }>();

  if (error || !classification) {
    return {
      status: "error",
      message: error?.message ?? "Unable to create data classification.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "classification.created",
    entityType: "data_classification",
    entityId: classification.id,
    metadata: {
      assetName: classification.asset_name,
      level: parsed.data.classificationLevel,
      containsPhi: parsed.data.containsPhi,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${classification.asset_name} classified.`,
  };
}

export async function updateDataClassificationLevel(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to update data classifications.",
    };
  }

  const parsed = updateDataClassificationLevelSchema.safeParse({
    classificationId: formData.get("classificationId"),
    classificationLevel: formData.get("classificationLevel"),
    encryptionRequired: formData.get("encryptionRequired"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Classification update is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: classification, error } = await admin
    .from("data_classifications")
    .update({
      classification_level: parsed.data.classificationLevel,
      encryption_required: parsed.data.encryptionRequired,
    })
    .eq("id", parsed.data.classificationId)
    .eq("organization_id", context.organization.id)
    .select("id, asset_name")
    .maybeSingle<{ id: string; asset_name: string }>();

  if (error || !classification) {
    return {
      status: "error",
      message: error?.message ?? "Classification was not found.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "classification.level_updated",
    entityType: "data_classification",
    entityId: classification.id,
    metadata: {
      assetName: classification.asset_name,
      level: parsed.data.classificationLevel,
      encryptionRequired: parsed.data.encryptionRequired,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${classification.asset_name} updated.`,
  };
}

