import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { can } from "@/lib/auth/permissions";
import { getCurrentUserContext } from "@/lib/auth/context";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reports",
  description: "Generate and export compliance, incident, risk, and audit reports.",
};

type ReportsPageProps = Readonly<{
  searchParams: Promise<{
    from?: string;
    to?: string;
    historyPage?: string;
    historyQuery?: string;
    historyReport?: string;
  }>;
}>;

type ReportExportAuditRow = {
  id: string;
  action: string;
  entity_id: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
};

function buildExportHref(report: "compliance" | "incidents" | "audit" | "risks" | "baa" | "backup", from?: string, to?: string) {
  const params = new URLSearchParams();

  if (from) {
    params.set("from", from);
  }

  if (to) {
    params.set("to", to);
  }

  const query = params.toString();
  return query ? `/api/reports/${report}?${query}` : `/api/reports/${report}`;
}

const historyReportOptions = ["all", "compliance", "incidents", "risks", "audit", "baa", "backup"] as const;
const HISTORY_PAGE_SIZE = 10;
type HistoryReportFilter = (typeof historyReportOptions)[number];

function normalizeHistoryPage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeHistoryReport(value: string | undefined): HistoryReportFilter {
  if (value && historyReportOptions.includes(value as HistoryReportFilter)) {
    return value as HistoryReportFilter;
  }

  return "all";
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const fromParam = typeof params.from === "string" ? params.from : "";
  const toParam = typeof params.to === "string" ? params.to : "";
  const context = await getCurrentUserContext();

  if (!context?.organization || !can(context.role, "view_reports")) {
    redirect("/dashboard");
  }

  const supabase = await createServerClient();
  const organizationId = context.organization.id;

  const [
    { count: controlCount },
    { count: incidentCount },
    { count: riskCount },
    { count: auditCount },
    { count: baaCount },
    { count: backupCount },
  ] =
    await Promise.all([
    supabase
      .from("compliance_controls")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("incident_reports")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("risk_assessments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("business_associate_agreements")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("backup_records")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  const historyPage = normalizeHistoryPage(params.historyPage);
  const historyReport = normalizeHistoryReport(params.historyReport);
  const historyQueryText = params.historyQuery?.trim() ?? "";

  let actorIdsFilter: string[] | null = null;

  if (historyQueryText) {
    const { data: membershipRows } = await supabase
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .returns<Array<{ user_id: string }>>();

    const memberUserIds = (membershipRows ?? []).map((row) => row.user_id);

    if (!memberUserIds.length) {
      actorIdsFilter = [];
    } else {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id")
        .in("user_id", memberUserIds)
        .or(`email.ilike.%${historyQueryText}%,full_name.ilike.%${historyQueryText}%`)
        .returns<Array<{ user_id: string }>>();

      actorIdsFilter = (profileRows ?? []).map((row) => row.user_id);
    }
  }

  let historyCountQuery = supabase
    .from("audit_logs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("action", "report.exported");

  let historyRowsQuery = supabase
    .from("audit_logs")
    .select("id, action, entity_id, actor_user_id, metadata, created_at, profiles(email, full_name)")
    .eq("organization_id", organizationId)
    .eq("action", "report.exported")
    .order("created_at", { ascending: false });

  if (fromParam) {
    const fromIso = `${fromParam}T00:00:00.000Z`;
    historyCountQuery = historyCountQuery.gte("created_at", fromIso);
    historyRowsQuery = historyRowsQuery.gte("created_at", fromIso);
  }

  if (toParam) {
    const toIso = `${toParam}T23:59:59.999Z`;
    historyCountQuery = historyCountQuery.lte("created_at", toIso);
    historyRowsQuery = historyRowsQuery.lte("created_at", toIso);
  }

  if (historyReport !== "all") {
    historyCountQuery = historyCountQuery.eq("entity_id", historyReport);
    historyRowsQuery = historyRowsQuery.eq("entity_id", historyReport);
  }

  if (actorIdsFilter) {
    if (!actorIdsFilter.length) {
      historyCountQuery = historyCountQuery.eq("actor_user_id", "00000000-0000-0000-0000-000000000000");
      historyRowsQuery = historyRowsQuery.eq("actor_user_id", "00000000-0000-0000-0000-000000000000");
    } else {
      historyCountQuery = historyCountQuery.in("actor_user_id", actorIdsFilter);
      historyRowsQuery = historyRowsQuery.in("actor_user_id", actorIdsFilter);
    }
  }

  const { count: historyCount } = await historyCountQuery;
  const safeHistoryCount = historyCount ?? 0;
  const totalHistoryPages = Math.max(1, Math.ceil(safeHistoryCount / HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const fromIndex = (currentHistoryPage - 1) * HISTORY_PAGE_SIZE;
  const toIndex = fromIndex + HISTORY_PAGE_SIZE - 1;
  const { data: reportHistory } = await historyRowsQuery.range(fromIndex, toIndex).returns<ReportExportAuditRow[]>();

  const historyParams = new URLSearchParams();
  if (fromParam) {
    historyParams.set("from", fromParam);
  }
  if (toParam) {
    historyParams.set("to", toParam);
  }
  if (historyQueryText) {
    historyParams.set("historyQuery", historyQueryText);
  }
  if (historyReport !== "all") {
    historyParams.set("historyReport", historyReport);
  }

  const pageHref = (page: number) => {
    const query = new URLSearchParams(historyParams);
    query.set("historyPage", String(page));
    return `/dashboard/reports?${query.toString()}`;
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-16">
      <section className="rounded-[2rem] border border-border bg-card/80 p-8 shadow-[0_20px_80px_rgba(16,57,61,0.12)]">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Reports</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight">Compliance exports</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
          Generate organization-scoped CSV exports for compliance, incident response, risk, and audit activity.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:bg-muted"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-6">
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <p className="text-sm text-muted-foreground">Controls</p>
          <p className="mt-2 text-3xl font-semibold">{controlCount ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <p className="text-sm text-muted-foreground">Incidents</p>
          <p className="mt-2 text-3xl font-semibold">{incidentCount ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <p className="text-sm text-muted-foreground">Risks</p>
          <p className="mt-2 text-3xl font-semibold">{riskCount ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <p className="text-sm text-muted-foreground">Audit events</p>
          <p className="mt-2 text-3xl font-semibold">{auditCount ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <p className="text-sm text-muted-foreground">BAAs</p>
          <p className="mt-2 text-3xl font-semibold">{baaCount ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <p className="text-sm text-muted-foreground">Backups</p>
          <p className="mt-2 text-3xl font-semibold">{backupCount ?? 0}</p>
        </article>
      </section>

      <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
        <h2 className="text-2xl font-semibold">Date range</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Optional filters apply to export timestamps and are passed to every report download link.
        </p>
        <form className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="from">
              From
            </label>
            <input
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
              defaultValue={params.from}
              id="from"
              name="from"
              type="date"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="to">
              To
            </label>
            <input
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
              defaultValue={params.to}
              id="to"
              name="to"
              type="date"
            />
          </div>
          <div className="flex items-end gap-3">
            <button
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              type="submit"
            >
              Apply
            </button>
            <a
              className="rounded-full border border-border bg-background px-6 py-3 text-sm font-medium transition hover:bg-muted"
              href="/dashboard/reports"
            >
              Clear
            </a>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <h3 className="text-xl font-semibold">Compliance controls</h3>
          <p className="mt-2 text-sm text-muted-foreground">Status, due dates, and evidence metadata.</p>
          <a
            className="mt-4 inline-flex rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:bg-muted"
              href={buildExportHref("compliance", params.from, params.to)}
          >
            Download CSV
          </a>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <h3 className="text-xl font-semibold">Incident reports</h3>
          <p className="mt-2 text-sm text-muted-foreground">Severity, status, detection, and closure timing.</p>
          <a
            className="mt-4 inline-flex rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:bg-muted"
              href={buildExportHref("incidents", params.from, params.to)}
          >
            Download CSV
          </a>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <h3 className="text-xl font-semibold">Risk register</h3>
          <p className="mt-2 text-sm text-muted-foreground">Risk scores, current status, and target dates.</p>
          <a
            className="mt-4 inline-flex rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:bg-muted"
              href={buildExportHref("risks", params.from, params.to)}
          >
            Download CSV
          </a>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <h3 className="text-xl font-semibold">Audit activity</h3>
          <p className="mt-2 text-sm text-muted-foreground">Security-sensitive events with actor and entity context.</p>
          <a
            className="mt-4 inline-flex rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:bg-muted"
            href={buildExportHref("audit", params.from, params.to)}
          >
            Download CSV
          </a>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <h3 className="text-xl font-semibold">BAA records</h3>
          <p className="mt-2 text-sm text-muted-foreground">Vendor agreement status, signatures, and renewal tracking.</p>
          <a
            className="mt-4 inline-flex rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:bg-muted"
            href={buildExportHref("baa", params.from, params.to)}
          >
            Download CSV
          </a>
        </article>
        <article className="rounded-2xl border border-border bg-card/90 p-5">
          <h3 className="text-xl font-semibold">Backup records</h3>
          <p className="mt-2 text-sm text-muted-foreground">Backup execution posture, retention windows, and next schedules.</p>
          <a
            className="mt-4 inline-flex rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:bg-muted"
            href={buildExportHref("backup", params.from, params.to)}
          >
            Download CSV
          </a>
        </article>
      </section>

      <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
        <h2 className="text-2xl font-semibold">Recent export history</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Report downloads with actor, report type, selected date range, and exported row count.
        </p>
        <form className="mt-5 grid gap-4 rounded-2xl border border-border bg-background p-4 md:grid-cols-4">
          <input name="from" type="hidden" value={params.from ?? ""} />
          <input name="to" type="hidden" value={toParam} />
          <input name="historyPage" type="hidden" value="1" />
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="historyQuery">
              Search actor
            </label>
            <input
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
              defaultValue={historyQueryText}
              id="historyQuery"
              name="historyQuery"
              placeholder="Name or email"
              type="text"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="historyReport">
              Report type
            </label>
            <select
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
              defaultValue={historyReport}
              id="historyReport"
              name="historyReport"
            >
              {historyReportOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button
              className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              type="submit"
            >
              Search
            </button>
            <a
              className="rounded-full border border-border bg-card px-5 py-3 text-sm font-medium transition hover:bg-muted"
                href={`/dashboard/reports${fromParam || toParam ? `?${new URLSearchParams({ from: fromParam, to: toParam }).toString()}` : ""}`}
            >
              Reset
            </a>
          </div>
        </form>
        <div className="mt-5 overflow-x-auto">
          {reportHistory?.length ? (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-3 font-medium">When</th>
                  <th className="px-3 py-3 font-medium">Actor</th>
                  <th className="px-3 py-3 font-medium">Report</th>
                  <th className="px-3 py-3 font-medium">Rows</th>
                  <th className="px-3 py-3 font-medium">Range</th>
                </tr>
              </thead>
              <tbody>
                {reportHistory.map((entry) => {
                  const report =
                    typeof entry.metadata?.report === "string"
                      ? entry.metadata.report
                      : typeof entry.entity_id === "string"
                        ? entry.entity_id
                        : "unknown";
                  const rows = typeof entry.metadata?.rows === "number" ? entry.metadata.rows : 0;
                  const from = typeof entry.metadata?.from === "string" ? entry.metadata.from : null;
                  const to = typeof entry.metadata?.to === "string" ? entry.metadata.to : null;
                  const actor = entry.profiles?.full_name ?? entry.profiles?.email ?? entry.actor_user_id ?? "Unknown";

                  return (
                    <tr className="border-b border-border/60" key={entry.id}>
                      <td className="px-3 py-3 text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</td>
                      <td className="px-3 py-3">{actor}</td>
                      <td className="px-3 py-3 capitalize">{report}</td>
                      <td className="px-3 py-3">{rows}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {from || to ? `${from ?? "start"} to ${to ?? "now"}` : "all time"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
              No report exports recorded yet.
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {currentHistoryPage} of {totalHistoryPages} | {safeHistoryCount} total records
          </p>
          <div className="flex gap-2">
            {currentHistoryPage > 1 ? (
              <a
                className="rounded-full border border-border bg-background px-4 py-2 font-medium transition hover:bg-muted"
                href={pageHref(currentHistoryPage - 1)}
              >
                Previous
              </a>
            ) : (
              <span className="rounded-full border border-border bg-muted px-4 py-2 text-muted-foreground">Previous</span>
            )}
            {currentHistoryPage < totalHistoryPages ? (
              <a
                className="rounded-full border border-border bg-background px-4 py-2 font-medium transition hover:bg-muted"
                href={pageHref(currentHistoryPage + 1)}
              >
                Next
              </a>
            ) : (
              <span className="rounded-full border border-border bg-muted px-4 py-2 text-muted-foreground">Next</span>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
