"use client";

import { useActionState } from "react";

import { createEhrIntegration, updateEhrIntegrationStatus } from "@/app/actions/integrations";
import { SubmitButton } from "@/components/auth/submit-button";
import type { IntegrationSyncRun } from "@/lib/auth/types";
import { initialFormState } from "@/lib/forms/form-state";
import {
  ehrProviders,
  integrationModes,
  integrationStatuses,
  type EhrProvider,
  type IntegrationMode,
  type IntegrationStatus,
} from "@/lib/validations/integrations";

type EhrIntegrationSummary = {
  id: string;
  provider: EhrProvider;
  mode: IntegrationMode;
  status: IntegrationStatus;
  external_tenant_id: string | null;
  sync_frequency_minutes: number;
  last_sync_at: string | null;
  notes: string | null;
};

type EhrIntegrationPanelProps = Readonly<{
  integrations: EhrIntegrationSummary[];
  syncRuns: IntegrationSyncRun[];
}>;

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function statusTone(status: IntegrationStatus) {
  if (status === "connected") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "syncing") {
    return "bg-amber-100 text-amber-900";
  }

  if (status === "error") {
    return "bg-red-100 text-red-800";
  }

  return "bg-slate-100 text-slate-700";
}

function runTone(status: IntegrationSyncRun["run_status"]) {
  if (status === "succeeded") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "failed") {
    return "bg-red-100 text-red-800";
  }

  if (status === "processing") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-slate-100 text-slate-700";
}

function IntegrationRow({ integration }: Readonly<{ integration: EhrIntegrationSummary }>) {
  const [state, formAction] = useActionState(updateEhrIntegrationStatus, initialFormState);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium capitalize">{formatLabel(integration.provider)}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(integration.status)}`}>
              {formatLabel(integration.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatLabel(integration.mode)} mode | every {integration.sync_frequency_minutes} minutes
            {integration.last_sync_at ? ` | last sync ${new Date(integration.last_sync_at).toLocaleString()}` : ""}
          </p>
          {integration.external_tenant_id ? (
            <p className="mt-1 text-sm text-muted-foreground">Tenant: {integration.external_tenant_id}</p>
          ) : null}
          {integration.notes ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{integration.notes}</p> : null}
        </div>
        <form action={formAction} className="flex w-full flex-col gap-2 md:w-auto md:min-w-64">
          <input name="integrationId" type="hidden" value={integration.id} />
          <select
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
            defaultValue={integration.status}
            name="status"
          >
            {integrationStatuses.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>
          <input
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
            defaultValue={integration.last_sync_at ? new Date(integration.last_sync_at).toISOString().slice(0, 16) : ""}
            name="lastSyncAt"
            type="datetime-local"
          />
          <button
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            type="submit"
          >
            Update integration
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}

function renderTelemetrySummary(telemetry: Record<string, unknown>) {
  const expectedRecords = typeof telemetry.expectedRecords === "number" ? telemetry.expectedRecords : null;
  const connectorVersion = typeof telemetry.connectorVersion === "string" ? telemetry.connectorVersion : null;

  if (expectedRecords === null && !connectorVersion) {
    return null;
  }

  return [expectedRecords !== null ? `expected ${expectedRecords} records` : null, connectorVersion ? `v${connectorVersion}` : null]
    .filter(Boolean)
    .join(" | ");
}

export function EhrIntegrationPanel({ integrations, syncRuns }: EhrIntegrationPanelProps) {
  const [state, formAction] = useActionState(createEhrIntegration, initialFormState);
  const runsInLast24Hours = syncRuns.filter((run) => Date.now() - new Date(run.requested_at).getTime() <= 86_400_000);
  const failedRuns = syncRuns.filter((run) => run.run_status === "failed");
  const latestRun = syncRuns[0] ?? null;

  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Integrations</p>
          <h2 className="text-2xl font-semibold">EHR integrations</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Configure one initial EHR integration path and track connector sync posture.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-72">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Configured</p>
            <p className="mt-2 text-3xl font-semibold">{integrations.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Connected</p>
            <p className="mt-2 text-3xl font-semibold">
              {integrations.filter((integration) => integration.status === "connected").length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Syncing</p>
            <p className="mt-2 text-3xl font-semibold">
              {integrations.filter((integration) => integration.status === "syncing").length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Error</p>
            <p className="mt-2 text-3xl font-semibold">
              {integrations.filter((integration) => integration.status === "error").length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Sync calls (24h)</p>
            <p className="mt-2 text-3xl font-semibold">{runsInLast24Hours.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Failed sync calls</p>
            <p className="mt-2 text-3xl font-semibold">{failedRuns.length}</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="mt-8 grid gap-4 rounded-[1.5rem] border border-border bg-background p-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="provider">
            Provider
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
            defaultValue="athenahealth"
            id="provider"
            name="provider"
          >
            {ehrProviders.map((provider) => (
              <option key={provider} value={provider}>
                {formatLabel(provider)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="mode">
            Mode
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
            defaultValue="sandbox"
            id="mode"
            name="mode"
          >
            {integrationModes.map((mode) => (
              <option key={mode} value={mode}>
                {formatLabel(mode)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="status">
            Status
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
            defaultValue="not_connected"
            id="status"
            name="status"
          >
            {integrationStatuses.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="syncFrequencyMinutes">
            Sync frequency (minutes)
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            defaultValue={60}
            id="syncFrequencyMinutes"
            max={1440}
            min={15}
            name="syncFrequencyMinutes"
            type="number"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="externalTenantId">
            External tenant ID
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="externalTenantId"
            name="externalTenantId"
            placeholder="tenant-12345"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="lastSyncAt">
            Last sync (UTC)
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="lastSyncAt"
            name="lastSyncAt"
            type="datetime-local"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="notes">
            Notes
          </label>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="notes"
            name="notes"
            placeholder="Track connector credential rotation and initial sync outcomes."
          />
        </div>
        <div className="md:col-span-2">
          <SubmitButton pendingLabel="Saving integration">Save integration</SubmitButton>
        </div>
        {state.message ? (
          <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </form>

      <div className="mt-6 space-y-4">
        {integrations.length ? (
          integrations.map((integration) => <IntegrationRow integration={integration} key={integration.id} />)
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No EHR integrations configured yet.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Recent sync monitoring</h3>
            <p className="mt-1 text-sm text-muted-foreground">Latest accepted API sync requests for all configured providers.</p>
          </div>
          {latestRun ? (
            <p className="text-sm text-muted-foreground">
              Last request: {new Date(latestRun.requested_at).toLocaleString()} ({formatLabel(latestRun.provider)})
            </p>
          ) : null}
        </div>

        {syncRuns.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Requested</th>
                  <th className="px-2 py-2 font-medium">Provider</th>
                  <th className="px-2 py-2 font-medium">Trigger</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Dry run</th>
                  <th className="px-2 py-2 font-medium">Telemetry</th>
                  <th className="px-2 py-2 font-medium">Request ID</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.map((run) => (
                  <tr className="border-t border-border/70" key={run.id}>
                    <td className="px-2 py-3 text-muted-foreground">{new Date(run.requested_at).toLocaleString()}</td>
                    <td className="px-2 py-3 capitalize">{formatLabel(run.provider)}</td>
                    <td className="px-2 py-3 capitalize">{formatLabel(run.trigger)}</td>
                    <td className="px-2 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${runTone(run.run_status)}`}>
                        {formatLabel(run.run_status)}
                      </span>
                    </td>
                    <td className="px-2 py-3">{run.dry_run ? "Yes" : "No"}</td>
                    <td className="px-2 py-3 text-muted-foreground">{renderTelemetrySummary(run.telemetry) ?? "-"}</td>
                    <td className="truncate px-2 py-3 font-mono text-xs text-muted-foreground">{run.request_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No sync telemetry has been captured yet.</p>
        )}
      </div>
    </section>
  );
}
