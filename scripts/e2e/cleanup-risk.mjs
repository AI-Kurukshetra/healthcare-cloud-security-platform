import { createAdminClientFromEnv, loadLocalEnv } from "./_supabase-env.mjs";

const DEFAULT_ORG_SLUG = "e2e-security-ops";
const DEFAULT_RISK_PREFIX = "E2E Risk ";

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
  const riskPrefix = process.env.E2E_RISK_TITLE_PREFIX ?? DEFAULT_RISK_PREFIX;

  const organizationId = await getOrganizationId(admin, slug);
  if (!organizationId) {
    console.log(`No E2E org found for slug=${slug}, cleanup skipped.`);
    return;
  }

  const { data: risks, error: riskDeleteError } = await admin
    .from("risk_assessments")
    .delete()
    .eq("organization_id", organizationId)
    .ilike("title", `${riskPrefix}%`)
    .select("id");

  if (riskDeleteError) {
    throw riskDeleteError;
  }

  const { error: auditDeleteError } = await admin
    .from("audit_logs")
    .delete()
    .eq("organization_id", organizationId)
    .eq("entity_type", "risk_assessment")
    .in("action", ["risk.created", "risk.status_updated"]);

  if (auditDeleteError) {
    throw auditDeleteError;
  }

  console.log(`Cleaned ${risks?.length ?? 0} E2E risk records for org_slug=${slug}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
