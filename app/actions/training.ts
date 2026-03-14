"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import type { FormState } from "@/lib/forms/form-state";
import { createAdminClient } from "@/lib/supabase/server";
import { createTrainingRecordSchema, updateTrainingRecordStatusSchema } from "@/lib/validations/training";

type TrainingRecord = {
  id: string;
  assigned_user_id: string;
  title: string;
  status: "not_started" | "in_progress" | "completed" | "overdue";
};

export async function createTrainingRecord(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !context.membership || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to assign training records.",
    };
  }

  const parsed = createTrainingRecordSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    assignedUserId: formData.get("assignedUserId"),
    dueDate: formData.get("dueDate"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Training record details are invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: assigneeMembership } = await admin
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", context.organization.id)
    .eq("user_id", parsed.data.assignedUserId)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!assigneeMembership) {
    return {
      status: "error",
      message: "Assignee must be an active member of your organization.",
    };
  }

  const { data: trainingRecord, error } = await admin
    .from("training_records")
    .insert({
      organization_id: context.organization.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      assigned_user_id: parsed.data.assignedUserId,
      assigned_by: context.user.id,
      due_date: parsed.data.dueDate ?? null,
    })
    .select("id, title")
    .single<{ id: string; title: string }>();

  if (error || !trainingRecord) {
    return {
      status: "error",
      message: error?.message ?? "Unable to assign training record.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "training.record_created",
    entityType: "training_record",
    entityId: trainingRecord.id,
    metadata: {
      assignedUserId: parsed.data.assignedUserId,
      dueDate: parsed.data.dueDate ?? null,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${trainingRecord.title} assigned.`,
  };
}

export async function updateTrainingRecordStatus(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization) {
    return {
      status: "error",
      message: "You need organization access to update training records.",
    };
  }

  const parsed = updateTrainingRecordStatusSchema.safeParse({
    trainingRecordId: formData.get("trainingRecordId"),
    status: formData.get("status"),
    completionNotes: formData.get("completionNotes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Training update request is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: record, error: loadError } = await admin
    .from("training_records")
    .select("id, assigned_user_id, title, status")
    .eq("id", parsed.data.trainingRecordId)
    .eq("organization_id", context.organization.id)
    .maybeSingle<TrainingRecord>();

  if (loadError || !record) {
    return {
      status: "error",
      message: "Training record was not found.",
    };
  }

  const canManage = can(context.role, "manage_compliance");
  const isAssignedUser = record.assigned_user_id === context.user.id;

  if (!canManage && !isAssignedUser) {
    return {
      status: "error",
      message: "You do not have permission to update this training record.",
    };
  }

  const completedAt =
    parsed.data.status === "completed" ? new Date().toISOString() : parsed.data.status === "overdue" ? null : null;

  const { error: updateError } = await admin
    .from("training_records")
    .update({
      status: parsed.data.status,
      completed_at: completedAt,
      completion_notes: parsed.data.completionNotes ?? null,
    })
    .eq("id", record.id)
    .eq("organization_id", context.organization.id);

  if (updateError) {
    return {
      status: "error",
      message: updateError.message,
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "training.status_updated",
    entityType: "training_record",
    entityId: record.id,
    metadata: {
      status: parsed.data.status,
      wasAssignedUser: isAssignedUser,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${record.title} updated.`,
  };
}

export async function completeTrainingRecord(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization) {
    return {
      status: "error",
      message: "You need organization access to complete training records.",
    };
  }

  const parsed = updateTrainingRecordStatusSchema.safeParse({
    trainingRecordId: formData.get("trainingRecordId"),
    status: "completed",
    completionNotes: formData.get("completionNotes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Training completion request is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: record, error: loadError } = await admin
    .from("training_records")
    .select("id, assigned_user_id, title, status")
    .eq("id", parsed.data.trainingRecordId)
    .eq("organization_id", context.organization.id)
    .maybeSingle<TrainingRecord>();

  if (loadError || !record) {
    return {
      status: "error",
      message: "Training record was not found.",
    };
  }

  const canManage = can(context.role, "manage_compliance");
  const isAssignedUser = record.assigned_user_id === context.user.id;

  if (!canManage && !isAssignedUser) {
    return {
      status: "error",
      message: "You do not have permission to complete this training record.",
    };
  }

  const completedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("training_records")
    .update({
      status: "completed",
      completed_at: completedAt,
      completion_notes: parsed.data.completionNotes ?? null,
    })
    .eq("id", record.id)
    .eq("organization_id", context.organization.id);

  if (updateError) {
    return {
      status: "error",
      message: updateError.message,
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "training.completed",
    entityType: "training_record",
    entityId: record.id,
    metadata: {
      wasAssignedUser: isAssignedUser,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${record.title} marked complete.`,
  };
}

