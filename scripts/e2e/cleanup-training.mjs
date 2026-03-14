import { createAdminClientFromEnv, loadLocalEnv } from "./_supabase-env.mjs";

const DEFAULT_ORG_SLUG = "e2e-security-ops";
const DEFAULT_TRAINING_PREFIX = "E2E Training ";

async function getOrganizationId(admin, slug) {
  const { data, error } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

async function main() {
  loadLocalEnv();
  const admin = createAdminClientFromEnv();

  const slug = process.env.E2E_ORG_SLUG ?? DEFAULT_ORG_SLUG;
  const trainingPrefix = process.env.E2E_TRAINING_TITLE_PREFIX ?? DEFAULT_TRAINING_PREFIX;

  const organizationId = await getOrganizationId(admin, slug);
  if (!organizationId) {
    console.log(`No E2E org found for slug=${slug}, cleanup skipped.`);
    return;
  }

  const { data: records, error: recordDeleteError } = await admin
    .from("training_records")
    .delete()
    .eq("organization_id", organizationId)
    .ilike("title", `${trainingPrefix}%`)
    .select("id");

  if (recordDeleteError) {
    throw recordDeleteError;
  }

  const { error: auditDeleteError } = await admin
    .from("audit_logs")
    .delete()
    .eq("organization_id", organizationId)
    .eq("entity_type", "training_record")
    .in("action", ["training.record_created", "training.status_updated", "training.completed"]);

  if (auditDeleteError) {
    throw auditDeleteError;
  }

  console.log(`Cleaned ${records?.length ?? 0} E2E training records for org_slug=${slug}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

