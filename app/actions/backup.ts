"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import type { FormState } from "@/lib/forms/form-state";
import { createAdminClient } from "@/lib/supabase/server";
import { createBackupRecordSchema, updateBackupRecordStatusSchema } from "@/lib/validations/backup";

export async function createBackupRecord(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !context.membership || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to create backup records.",
    };
  }

  const parsed = createBackupRecordSchema.safeParse({
    systemName: formData.get("systemName"),
    backupScope: formData.get("backupScope"),
    status: formData.get("status"),
    lastSuccessAt: formData.get("lastSuccessAt"),
    nextScheduledAt: formData.get("nextScheduledAt"),
    retentionDays: formData.get("retentionDays"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Backup details are invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: backup, error } = await admin
    .from("backup_records")
    .insert({
      organization_id: context.organization.id,
      system_name: parsed.data.systemName,
      backup_scope: parsed.data.backupScope,
      status: parsed.data.status,
      last_success_at: parsed.data.lastSuccessAt ?? null,
      next_scheduled_at: parsed.data.nextScheduledAt ?? null,
      retention_days: parsed.data.retentionDays,
      notes: parsed.data.notes ?? null,
      owner_membership_id: context.membership.id,
      created_by: context.user.id,
    })
    .select("id, system_name")
    .single<{ id: string; system_name: string }>();

  if (error || !backup) {
    return {
      status: "error",
      message: error?.message ?? "Unable to create backup record.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "backup.record_created",
    entityType: "backup_record",
    entityId: backup.id,
    metadata: {
      systemName: backup.system_name,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${backup.system_name} backup record created.`,
  };
}

export async function updateBackupRecordStatus(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to update backup records.",
    };
  }

  const parsed = updateBackupRecordStatusSchema.safeParse({
    backupId: formData.get("backupId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Backup status update is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: backup, error } = await admin
    .from("backup_records")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.backupId)
    .eq("organization_id", context.organization.id)
    .select("id, system_name")
    .maybeSingle<{ id: string; system_name: string }>();

  if (error || !backup) {
    return {
      status: "error",
      message: error?.message ?? "Backup record was not found.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "backup.status_updated",
    entityType: "backup_record",
    entityId: backup.id,
    metadata: {
      systemName: backup.system_name,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${backup.system_name} backup status updated.`,
  };
}
