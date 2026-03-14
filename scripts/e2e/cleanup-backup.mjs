import { createAdminClientFromEnv, loadLocalEnv } from "./_supabase-env.mjs";

async function main() {
  loadLocalEnv();
  const admin = createAdminClientFromEnv();
  const orgSlug = process.env.E2E_ORG_SLUG ?? "e2e-security-ops";
  const systemPrefix = process.env.E2E_BACKUP_SYSTEM_PREFIX ?? "E2E Backup ";

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (orgError) {
    throw orgError;
  }
  if (!org) {
    console.log(`No organization found for slug=${orgSlug}, backup cleanup skipped.`);
    return;
  }

  const { data: deleted, error: backupError } = await admin
    .from("backup_records")
    .delete()
    .eq("organization_id", org.id)
    .ilike("system_name", `${systemPrefix}%`)
    .select("id");
  if (backupError) {
    throw backupError;
  }

  const { error: auditError } = await admin
    .from("audit_logs")
    .delete()
    .eq("organization_id", org.id)
    .eq("entity_type", "backup_record")
    .in("action", ["backup.record_created", "backup.status_updated"]);
  if (auditError) {
    throw auditError;
  }

  console.log(`Cleaned ${deleted?.length ?? 0} E2E backup records for org_slug=${orgSlug}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

