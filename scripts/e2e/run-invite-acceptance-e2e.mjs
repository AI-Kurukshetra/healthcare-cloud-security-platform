import { execSync } from "node:child_process";

import { loadLocalEnv } from "./_supabase-env.mjs";

function run(command) {
  execSync(command, {
    stdio: "inherit",
    env: process.env,
  });
}

loadLocalEnv();

run("node scripts/e2e/seed-risk.mjs");
run("corepack pnpm test:e2e tests/e2e/invite-acceptance.spec.ts");
