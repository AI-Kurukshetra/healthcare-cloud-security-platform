import { createAdminClientFromEnv, getE2ECredentials, getE2EStaffCredentials, loadLocalEnv } from "./_supabase-env.mjs";

const DEFAULT_ORG_SLUG = "e2e-security-ops";
const DEFAULT_ORG_NAME = "E2E Security Ops";
const DEFAULT_RESET_USER = "true";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureUser(admin, email, password, fullName, resetUser) {
  let existing = await findUserByEmail(admin, email);
  if (existing && resetUser) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(existing.id);
    if (deleteError) {
      throw deleteError;
    }

    existing = null;
  }

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (error || !data.user) {
      throw error ?? new Error(`Failed to create E2E user ${email}.`);
    }

    return data.user.id;
  }

  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: {
      full_name: existing.user_metadata?.full_name ?? fullName,
    },
  });

  if (error) {
    throw error;
  }

  return existing.id;
}

async function ensureProfileRow(admin, userId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await admin.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
    if (error) {
      throw error;
    }

    if (data) {
      return;
    }

    await sleep(300);
  }

  throw new Error("Profile row was not created for the E2E user.");
}

async function ensureOrganization(admin, createdBy) {
  const slug = process.env.E2E_ORG_SLUG ?? DEFAULT_ORG_SLUG;
  const name = process.env.E2E_ORG_NAME ?? DEFAULT_ORG_NAME;

  const { data: existing, error: selectError } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return { id: existing.id, slug };
  }

  const { data: created, error: createError } = await admin
    .from("organizations")
    .insert({
      name,
      slug,
      organization_type: "clinic",
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw createError ?? new Error("Failed to create E2E organization.");
  }

  return { id: created.id, slug };
}

async function ensureActiveMembership(admin, organizationId, userId, role) {
  const { error: revokeError } = await admin
    .from("organization_memberships")
    .update({ status: "revoked" })
    .eq("user_id", userId)
    .eq("status", "active")
    .neq("organization_id", organizationId);

  if (revokeError) {
    throw revokeError;
  }

  const { error: membershipError } = await admin.from("organization_memberships").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      role,
      status: "active",
    },
    { onConflict: "organization_id,user_id" },
  );

  if (membershipError) {
    throw membershipError;
  }
}

async function main() {
  loadLocalEnv();
  const admin = createAdminClientFromEnv();
  const privileged = getE2ECredentials();
  const staff = getE2EStaffCredentials();
  const resetUser = (process.env.E2E_RESET_USER ?? DEFAULT_RESET_USER).toLowerCase() === "true";

  const privilegedUserId = await ensureUser(admin, privileged.email, privileged.password, "E2E Org Admin", resetUser);
  const staffUserId = await ensureUser(admin, staff.email, staff.password, "E2E Staff User", resetUser);

  await ensureProfileRow(admin, privilegedUserId);
  await ensureProfileRow(admin, staffUserId);

  const organization = await ensureOrganization(admin, privilegedUserId);
  await ensureActiveMembership(admin, organization.id, privilegedUserId, "org_admin");
  await ensureActiveMembership(admin, organization.id, staffUserId, "staff");

  console.log(
    `Seeded E2E data: admin=${privileged.email}, staff=${staff.email}, org_slug=${organization.slug}, reset_user=${resetUser}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
