import { createAdminClient } from "@/lib/supabase/server";

type AuditPayload = {
  organizationId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function logAuditEvent(payload: AuditPayload) {
  if (!payload.organizationId) {
    return;
  }

  const admin = createAdminClient();

  await admin.from("audit_logs").insert({
    organization_id: payload.organizationId,
    actor_user_id: payload.actorUserId,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
    metadata: payload.metadata ?? {},
  });
}
