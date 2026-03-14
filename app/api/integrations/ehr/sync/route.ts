import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { checkRateLimit } from "@/lib/api/rate-limit";
import { logAuditEvent } from "@/lib/auth/audit";
import { createAdminClient } from "@/lib/supabase/server";
import { integrationSyncRequestSchema } from "@/lib/validations/integration-sync";

const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function getIntegrationToken() {
  return process.env.INTEGRATION_SYNC_TOKEN?.trim() ?? "";
}

function getRateLimitPerMinute() {
  const raw = process.env.INTEGRATION_SYNC_RATE_LIMIT_PER_MINUTE;
  const parsed = Number.parseInt(raw ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_RATE_LIMIT_PER_MINUTE;
  }

  return parsed;
}

function getClientIdentifier(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}

export async function POST(request: NextRequest) {
  const integrationToken = getIntegrationToken();

  if (!integrationToken) {
    return Response.json(
      {
        error: "Integration sync token is not configured.",
      },
      { status: 503 },
    );
  }

  const receivedToken = request.headers.get("x-integration-token")?.trim() ?? "";
  if (!receivedToken || receivedToken !== integrationToken) {
    return Response.json(
      {
        error: "Unauthorized integration request.",
      },
      { status: 401 },
    );
  }

  const parsedBody = integrationSyncRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return Response.json(
      {
        error: parsedBody.error.issues[0]?.message ?? "Invalid sync request payload.",
      },
      { status: 400 },
    );
  }

  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(
    `ehr-sync:${clientId}:${parsedBody.data.organizationSlug}`,
    getRateLimitPerMinute(),
    RATE_LIMIT_WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: "Rate limit exceeded for integration sync requests.",
      },
      {
        status: 429,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(rateLimit.resetAt),
        },
      },
    );
  }

  const admin = createAdminClient();
  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id, slug")
    .eq("slug", parsedBody.data.organizationSlug)
    .maybeSingle<{ id: string; slug: string }>();

  if (organizationError || !organization) {
    return Response.json(
      {
        error: "Organization not found.",
      },
      { status: 404 },
    );
  }

  const { data: integration, error: integrationError } = await admin
    .from("ehr_integrations")
    .select("id, provider, status")
    .eq("organization_id", organization.id)
    .eq("provider", parsedBody.data.provider)
    .maybeSingle<{ id: string; provider: string; status: string }>();

  if (integrationError || !integration) {
    return Response.json(
      {
        error: "Integration is not configured for this provider.",
      },
      { status: 404 },
    );
  }

  if (integration.status === "not_connected" || integration.status === "error" || integration.status === "paused") {
    return Response.json(
      {
        error: `Integration status '${integration.status}' does not allow sync.`,
      },
      { status: 409 },
    );
  }

  const requestId = randomUUID();
  const syncRequestedAt = parsedBody.data.requestedAt ?? new Date().toISOString();
  const acceptedAt = new Date().toISOString();

  if (!parsedBody.data.dryRun) {
    await admin
      .from("ehr_integrations")
      .update({
        status: "syncing",
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", integration.id)
      .eq("organization_id", organization.id);
  }

  const { error: runInsertError } = await admin.from("integration_sync_runs").insert({
    organization_id: organization.id,
    integration_id: integration.id,
    request_id: requestId,
    provider: integration.provider,
    trigger: parsedBody.data.trigger,
    run_status: "accepted",
    dry_run: parsedBody.data.dryRun,
    requested_at: syncRequestedAt,
    accepted_at: acceptedAt,
    source_identifier: clientId,
    telemetry: parsedBody.data.telemetry ?? {},
  });

  if (runInsertError) {
    return Response.json(
      {
        error: "Unable to persist sync run telemetry.",
      },
      { status: 500 },
    );
  }

  await logAuditEvent({
    organizationId: organization.id,
    actorUserId: null,
    action: "integration.sync_requested",
    entityType: "ehr_integration",
    entityId: integration.id,
    metadata: {
      provider: integration.provider,
      trigger: parsedBody.data.trigger,
      dryRun: parsedBody.data.dryRun,
      requestId,
      source: "api",
    },
  });

  return Response.json(
    {
      requestId,
      status: "accepted",
      organization: organization.slug,
      provider: integration.provider,
      dryRun: parsedBody.data.dryRun,
      requestedAt: syncRequestedAt,
      acceptedAt,
      telemetry: parsedBody.data.telemetry ?? {},
    },
    {
      status: 202,
      headers: {
        "x-ratelimit-remaining": String(rateLimit.remaining),
        "x-ratelimit-reset": String(rateLimit.resetAt),
      },
    },
  );
}
