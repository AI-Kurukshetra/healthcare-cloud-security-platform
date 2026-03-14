import { createAdminClientFromEnv, loadLocalEnv } from "./_supabase-env.mjs";

async function main() {
  loadLocalEnv();
  const admin = createAdminClientFromEnv();
  const orgSlug = process.env.E2E_ORG_SLUG ?? "e2e-security-ops";
  const vendorPrefix = process.env.E2E_BAA_VENDOR_PREFIX ?? "E2E BAA Vendor";

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (orgError) {
    throw orgError;
  }
  if (!org) {
    console.log(`No organization found for slug=${orgSlug}, BAA cleanup skipped.`);
    return;
  }

  const { data: deleted, error: baaError } = await admin
    .from("business_associate_agreements")
    .delete()
    .eq("organization_id", org.id)
    .ilike("vendor_name", `${vendorPrefix}%`)
    .select("id");
  if (baaError) {
    if (baaError.code === "PGRST205") {
      console.log("BAA table not found in schema cache yet, cleanup skipped.");
      return;
    }
    throw baaError;
  }

  const { error: auditError } = await admin
    .from("audit_logs")
    .delete()
    .eq("organization_id", org.id)
    .eq("entity_type", "business_associate_agreement")
    .in("action", ["baa.created", "baa.status_updated"]);
  if (auditError) {
    throw auditError;
  }

  console.log(`Cleaned ${deleted?.length ?? 0} E2E BAA records for org_slug=${orgSlug}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
