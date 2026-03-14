import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const ENV_PATH = path.resolve(process.cwd(), ".env.local");

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separator = trimmed.indexOf("=");
  if (separator <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();
  value = value.replace(/^['"]|['"]$/g, "");

  return [key, value];
}

export function loadLocalEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }

  const file = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of file.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    const [key, value] = parsed;
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function getRequiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getE2ECredentials() {
  const email = process.env.E2E_USER_EMAIL ?? process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_USER_PASSWORD ?? process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing E2E credentials. Set E2E_USER_EMAIL and E2E_USER_PASSWORD.");
  }

  return { email, password };
}

function deriveStaffEmail(email) {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) {
    throw new Error("Unable to derive staff email from E2E user email.");
  }

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  return `${local}+staff@${domain}`;
}

export function getE2EStaffCredentials() {
  const admin = getE2ECredentials();
  const email = process.env.E2E_STAFF_EMAIL ?? deriveStaffEmail(admin.email);
  const password = process.env.E2E_STAFF_PASSWORD ?? admin.password;

  if (!email || !password) {
    throw new Error("Missing E2E staff credentials. Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD.");
  }

  return { email, password };
}

export function createAdminClientFromEnv() {
  const url = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
