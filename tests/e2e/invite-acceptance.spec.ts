import { createHmac } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type InviteeUser = {
  id: string;
  email?: string;
};

type AdminClient = {
  auth: {
    admin: {
      listUsers: (params: { page: number; perPage: number }) => Promise<{
        data: { users: InviteeUser[] };
        error: { message: string } | null;
      }>;
      updateUserById: (userId: string, attributes: { password: string; email_confirm: boolean }) => Promise<{
        error: { message: string } | null;
      }>;
      createUser: (attributes: {
        email: string;
        password: string;
        email_confirm: boolean;
        user_metadata: { full_name: string };
      }) => Promise<{
        data: { user: InviteeUser | null };
        error: { message: string } | null;
      }>;
    };
  };
};

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

  throw new Error("Unable to complete MFA verification.");
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /continue/i }).click();
  await Promise.race([
    page.waitForURL(/\/(dashboard|mfa-setup|access-pending|accept-invite)/, { timeout: 10000 }),
    page.locator("p.mt-4.rounded-2xl.border.border-red-200").first().waitFor({ timeout: 10000 }),
  ]).catch(() => null);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureInviteeUser(adminClient: AdminClient, email: string, password: string) {
  const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) {
    throw new Error(usersError.message);
  }

  const existing = usersData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const { error } = await adminClient.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (error) {
      throw new Error(error.message);
    }

    return existing.id;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Invitee" },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Unable to create invitee user.");
  }

  return data.user.id;
}

test("org admin can invite, invitee can accept, and invitee gets staff access", async ({ page }) => {
  const adminEmail = process.env.E2E_USER_EMAIL;
  const adminPassword = process.env.E2E_USER_PASSWORD;
  test.skip(!adminEmail || !adminPassword, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.");

  const projectUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const orgSlug = process.env.E2E_ORG_SLUG ?? "e2e-security-ops";
  const inviteePassword = process.env.E2E_INVITEE_PASSWORD ?? "InviteePass123!";
  const baseInviteEmail =
    process.env.E2E_INVITEE_EMAIL_PREFIX ?? adminEmail!.replace("@", "+invitee@");
  const inviteeEmail = `${Date.now()}.${baseInviteEmail}`;
  const supabaseAdmin = createClient(projectUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: org } = await supabaseAdmin.from("organizations").select("id").eq("slug", orgSlug).maybeSingle<{ id: string }>();
  if (!org) {
    throw new Error(`Organization with slug ${orgSlug} not found.`);
  }

  await login(page, adminEmail!, adminPassword!);
  await completeMfaIfRequired(page);
  await expect(page).toHaveURL(/\/dashboard/);

  const inviteCard = page.locator("div").filter({ has: page.getByRole("heading", { name: /add a team member/i }) }).first();
  await inviteCard.getByLabel("Email").fill(inviteeEmail);
  await inviteCard.getByLabel("Role").selectOption("staff");
  await inviteCard.getByRole("button", { name: /send invitation/i }).click();

  let invitationId: string | null = null;
  let authUserId: string | null = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const { data } = await supabaseAdmin
      .from("invitations")
      .select("id, auth_user_id")
      .eq("organization_id", org.id)
      .eq("email", inviteeEmail.toLowerCase())
      .eq("status", "pending")
      .maybeSingle<{ id: string; auth_user_id: string | null }>();

    invitationId = data?.id ?? null;
    authUserId = data?.auth_user_id ?? null;
    if (invitationId) {
      break;
    }

    await wait(500);
  }

  if (!invitationId) {
    const inviteMessage = (await inviteCard.locator("p.mt-4").first().textContent())?.trim();
    if (inviteMessage) {
      throw new Error(`Invitation was not created. UI message: ${inviteMessage}`);
    }
    throw new Error("Invitation record was not created.");
  }

  if (!authUserId) {
    authUserId = await ensureInviteeUser(supabaseAdmin, inviteeEmail, inviteePassword);
    await supabaseAdmin.from("invitations").update({ auth_user_id: authUserId }).eq("id", invitationId);
  }
  if (!authUserId) {
    throw new Error("Unable to resolve invitee auth user id.");
  }

  const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password: inviteePassword,
    email_confirm: true,
  });
  if (passwordError) {
    throw new Error(passwordError.message);
  }

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto(`/accept-invite?invitation=${invitationId}`);
  await expect(page).toHaveURL(/\/login\?redirectTo=/);
  await page.getByLabel("Email").fill(inviteeEmail);
  await page.getByLabel("Password").fill(inviteePassword);
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page).toHaveURL(new RegExp(`/accept-invite\\?invitation=${invitationId}`));

  await page.getByRole("button", { name: /accept invitation/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await expect(page.getByRole("heading", { name: /security operations dashboard/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /risk register/i })).toHaveCount(0);

  const { data: acceptedInvite } = await supabaseAdmin
    .from("invitations")
    .select("status")
    .eq("id", invitationId)
    .maybeSingle<{ status: string }>();
  expect(acceptedInvite?.status).toBe("accepted");

  const { data: membership } = await supabaseAdmin
    .from("organization_memberships")
    .select("status, role")
    .eq("organization_id", org.id)
    .eq("user_id", authUserId)
    .maybeSingle<{ status: string; role: string }>();
  expect(membership?.status).toBe("active");
  expect(membership?.role).toBe("staff");
});
