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

async function completeMfaIfRequired(page: Page) {
  if (!page.url().includes("/mfa-setup")) {
    return;
  }

  await page.getByRole("button", { name: /start mfa setup/i }).click();
  const secret = (await page.locator("code").first().textContent())?.trim();
  if (!secret) {
    throw new Error("MFA secret was not rendered.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const candidates = [generateTotp(secret, nowSeconds), generateTotp(secret, nowSeconds + 30)];

  for (const code of candidates) {
    await page.getByLabel("Verification code").fill(code);
    await page.getByRole("button", { name: /verify/i }).click();
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 5000 });
      return;
    } catch {
      // try next code
    }
  }
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

async function assertBaaAuditEvents() {
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
      .eq("entity_type", "business_associate_agreement")
      .in("action", ["baa.created", "baa.status_updated"]);

    if (error) {
      throw new Error(error.message);
    }

    const actions = new Set((data ?? []).map((row) => row.action));
    if (actions.has("baa.created") && actions.has("baa.status_updated")) {
      return;
    }

    await wait(700);
  }

  throw new Error("Expected baa.created and baa.status_updated audit events were not observed.");
}

test("privileged user can create and update a baa record", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.");

  await login(page, email!, password!);
  await completeMfaIfRequired(page);
  await expect(page).toHaveURL(/\/dashboard/);

  const baaHeading = page.getByRole("heading", { name: /business associate agreements/i });
  await expect(baaHeading).toBeVisible();
  const baaSection = page.locator("section").filter({ has: baaHeading });
  const baaCreateForm = page.locator('form:has(button:has-text("Create BAA"))').first();

  const prefix = process.env.E2E_BAA_VENDOR_PREFIX ?? "E2E BAA Vendor";
  const vendor = `${prefix} ${Date.now()}`;

  await baaCreateForm.locator('input[name="vendorName"]').fill(vendor);
  await baaCreateForm.locator('input[name="contactEmail"]').fill("legal@e2e-vendor.example");
  await baaCreateForm.locator('select[name="status"]').selectOption("under_review");
  await baaCreateForm.locator('input[name="signedAt"]').fill("2026-03-14");
  await baaCreateForm.locator('input[name="renewalDate"]').fill("2027-03-14");
  await baaCreateForm.locator('input[name="documentUrl"]').fill("https://example.com/baa/e2e");
  await baaCreateForm.getByRole("button", { name: /create baa/i }).click();

  await expect(baaSection.getByText(`${vendor} BAA created.`)).toBeVisible();
  const row = baaSection.locator("div.rounded-2xl.border.border-border.bg-background.p-4").filter({ hasText: vendor });
  await expect(row).toBeVisible();

  await row.getByRole("combobox").selectOption("active");
  await row.getByRole("button", { name: /update baa/i }).click();
  await expect(baaSection.getByText(`${vendor} BAA updated.`)).toBeVisible();
  await expect(row.locator("span.rounded-full").first()).toContainText(/active/i);
  await assertBaaAuditEvents();
});
