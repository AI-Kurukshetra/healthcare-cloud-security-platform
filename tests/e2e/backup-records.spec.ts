import { createHmac } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

function decodeBase32(base32: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = base32.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");

  let bits = "";
  for (const char of normalized) {
    const value = alphabet.indexOf(char);
    if (value < 0) {
      throw new Error(`Invalid base32 character: ${char}`);
    }

    bits += value.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTotp(secret: string, unixSeconds: number) {
  const key = decodeBase32(secret);
  const counter = Math.floor(unixSeconds / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

async function completeMfaEnrollmentIfRequired(page: Page) {
  if (!page.url().includes("/mfa-setup")) {
    return;
  }

  await page.getByRole("button", { name: /start mfa setup/i }).click();
  const secret = (await page.locator("code").first().textContent())?.trim();
  if (!secret) {
    throw new Error("MFA setup secret was not rendered.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const candidates = [generateTotp(secret, nowSeconds), generateTotp(secret, nowSeconds + 30)];

  for (const code of candidates) {
    await page.getByLabel("Verification code").fill(code);
    await page.getByRole("button", { name: /verify and continue/i }).click();
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 5000 });
      return;
    } catch {
      // Try next code window if verification races a TOTP boundary.
    }
  }

  throw new Error("MFA verification failed.");
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getAuditClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function assertBackupAuditEvents() {
  const auditClient = getAuditClient();
  if (!auditClient) {
    test.skip(true, "Missing Supabase service env for audit assertions.");
    return;
  }

  const orgSlug = process.env.E2E_ORG_SLUG ?? "e2e-security-ops";
  const { data: org, error: orgError } = await auditClient
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle<{ id: string }>();
  if (orgError || !org) {
    throw new Error(orgError?.message ?? `Organization not found for slug ${orgSlug}`);
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await auditClient
      .from("audit_logs")
      .select("action")
      .eq("organization_id", org.id)
      .eq("entity_type", "backup_record")
      .in("action", ["backup.record_created", "backup.status_updated"]);

    if (error) {
      throw new Error(error.message);
    }

    const actions = new Set((data ?? []).map((row) => row.action));
    if (actions.has("backup.record_created") && actions.has("backup.status_updated")) {
      return;
    }

    await wait(700);
  }

  throw new Error("Expected backup.record_created and backup.status_updated audit events were not observed.");
}

function getPrivilegedCredentials() {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  return { email, password };
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /continue/i }).click();
  await Promise.race([
    page.waitForURL(/\/(dashboard|mfa-setup|access-pending)/, { timeout: 10000 }),
    page.locator("p.mt-4.rounded-2xl.border.border-red-200").first().waitFor({ timeout: 10000 }),
  ]).catch(() => null);
}

test("privileged user can create and update a backup record with audit entries", async ({ page }) => {
  const { email, password } = getPrivilegedCredentials();

  if (!email || !password) {
    console.log("SKIP_REASON: missing E2E_USER_EMAIL/E2E_USER_PASSWORD");
    test.skip(true, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run backup records E2E.");
    return;
  }

  await login(page, email, password);

  if (page.url().includes("/access-pending")) {
    console.log("SKIP_REASON: redirected to /access-pending (no active membership)");
    test.skip(true, "Test user needs an active organization membership.");
  }

  if (page.url().includes("/login")) {
    console.log("SKIP_REASON: remained on /login (authentication failed)");
    test.skip(true, "E2E login failed for provided credentials.");
  }

  await completeMfaEnrollmentIfRequired(page);
  await expect(page).toHaveURL(/\/dashboard/);

  const backupHeading = page.getByRole("heading", { name: /backup and recovery tracking/i });
  if (!(await backupHeading.isVisible())) {
    console.log("SKIP_REASON: backup panel not visible (insufficient role permission)");
    test.skip(true, "Test user must have compliance permissions to manage backups.");
  }

  const uniqueSystemName = `E2E Backup ${Date.now()}`;
  const backupCreateForm = page.locator('form:has(button:has-text("Create backup record"))').first();

  await backupCreateForm.locator('input[name="systemName"]').fill(uniqueSystemName);
  await backupCreateForm.locator('input[name="backupScope"]').fill("Daily encrypted full snapshot");
  await backupCreateForm.locator('select[name="status"]').selectOption("scheduled");
  await backupCreateForm.locator('input[name="retentionDays"]').fill("45");
  await backupCreateForm.locator('textarea[name="notes"]').fill("Automated E2E backup validation.");
  await backupCreateForm.getByRole("button", { name: /create backup record/i }).click();

  const successMessage = backupCreateForm.locator("p.text-sm");
  await expect(successMessage).toContainText("backup record created", { timeout: 10000 });

  await page.reload();
  const reloadedHeading = page.getByRole("heading", { name: /backup and recovery tracking/i });
  await expect(reloadedHeading).toBeVisible();
  const reloadedSection = page.locator("section").filter({ has: reloadedHeading });
  const row = reloadedSection.locator("div.rounded-2xl.border.border-border.bg-background.p-4").filter({
    hasText: uniqueSystemName,
  });
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.getByRole("combobox").selectOption("successful");
  await row.getByRole("button", { name: /update backup/i }).click();

  await assertBackupAuditEvents();
});
