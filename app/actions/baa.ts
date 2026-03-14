"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import type { FormState } from "@/lib/forms/form-state";
import { createAdminClient } from "@/lib/supabase/server";
import { createBaaSchema, updateBaaStatusSchema } from "@/lib/validations/baa";

export async function createBaa(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !context.membership || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to create BAA records.",
    };
  }

  const parsed = createBaaSchema.safeParse({
    vendorName: formData.get("vendorName"),
    contactEmail: formData.get("contactEmail"),
    status: formData.get("status"),
    signedAt: formData.get("signedAt"),
    renewalDate: formData.get("renewalDate"),
    documentUrl: formData.get("documentUrl"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "BAA details are invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: baa, error } = await admin
    .from("business_associate_agreements")
    .insert({
      organization_id: context.organization.id,
      vendor_name: parsed.data.vendorName,
      contact_email: parsed.data.contactEmail ?? null,
      status: parsed.data.status,
      signed_at: parsed.data.signedAt ?? null,
      renewal_date: parsed.data.renewalDate ?? null,
      document_url: parsed.data.documentUrl ?? null,
      notes: parsed.data.notes ?? null,
      owner_membership_id: context.membership.id,
      created_by: context.user.id,
    })
    .select("id, vendor_name")
    .single<{ id: string; vendor_name: string }>();

  if (error || !baa) {
    return {
      status: "error",
      message: error?.message ?? "Unable to create BAA record.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "baa.created",
    entityType: "business_associate_agreement",
    entityId: baa.id,
    metadata: {
      vendor: baa.vendor_name,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${baa.vendor_name} BAA created.`,
  };
}

export async function updateBaaStatus(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "manage_compliance")) {
    return {
      status: "error",
      message: "You do not have permission to update BAA records.",
    };
  }

  const parsed = updateBaaStatusSchema.safeParse({
    baaId: formData.get("baaId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "BAA status update is invalid.",
    };
  }

  const admin = createAdminClient();
  const { data: baa, error } = await admin
    .from("business_associate_agreements")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.baaId)
    .eq("organization_id", context.organization.id)
    .select("id, vendor_name")
    .maybeSingle<{ id: string; vendor_name: string }>();

  if (error || !baa) {
    return {
      status: "error",
      message: error?.message ?? "BAA record was not found.",
    };
  }

  await logAuditEvent({
    organizationId: context.organization.id,
    actorUserId: context.user.id,
    action: "baa.status_updated",
    entityType: "business_associate_agreement",
    entityId: baa.id,
    metadata: {
      vendor: baa.vendor_name,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `${baa.vendor_name} BAA updated.`,
  };
}
