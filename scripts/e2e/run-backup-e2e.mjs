import { execSync } from "node:child_process";

import { loadLocalEnv } from "./_supabase-env.mjs";

function run(command) {
  execSync(command, {
    stdio: "inherit",
    env: process.env,
  });
}

let failed = false;

loadLocalEnv();

try {
  run("node scripts/e2e/seed-risk.mjs");
  run("corepack pnpm test:e2e tests/e2e/backup-records.spec.ts");
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.message : error);
} finally {
  try {
    run("node scripts/e2e/cleanup-backup.mjs");
  } catch (cleanupError) {
    console.error("Backup E2E cleanup failed.");
    console.error(cleanupError instanceof Error ? cleanupError.message : cleanupError);
    process.exit(1);
  }
}

if (failed) {
  process.exit(1);
}

