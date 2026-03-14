import { NextRequest } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import { can } from "@/lib/auth/permissions";
import { toCsv } from "@/lib/reports/csv";
import { createAdminClient } from "@/lib/supabase/server";

type ReportKind = "compliance" | "incidents" | "audit" | "risks" | "baa" | "backup";

type ComplianceExportRow = {
  control_code: string;
  title: string;
  category: string;
  status: string;
  due_date: string | null;
  evidence_summary: string | null;
  updated_at: string;
};

type IncidentExportRow = {
  title: string;
  severity: string;
  status: string;
  affected_system: string | null;
  detected_at: string;
  resolved_at: string | null;
  updated_at: string;
};

type AuditExportRow = {
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string | null;
  created_at: string;
};

type RiskExportRow = {
  title: string;
  category: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  status: string;
  target_date: string | null;
  updated_at: string;
};

type BaaExportRow = {
  vendor_name: string;
  contact_email: string | null;
  status: string;
  signed_at: string | null;
  renewal_date: string | null;
  document_url: string | null;
  updated_at: string;
};

type BackupExportRow = {
  system_name: string;
  backup_scope: string;
  status: string;
  last_success_at: string | null;
  next_scheduled_at: string | null;
  retention_days: number;
  updated_at: string;
};

function isReportKind(value: string): value is ReportKind {
  return value === "compliance" || value === "incidents" || value === "audit" || value === "risks" || value === "baa" || value === "backup";
}

function parseDateRange(searchParams: URLSearchParams) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (from && !dateRegex.test(from)) {
    return { error: "Invalid 'from' date format. Use YYYY-MM-DD." };
  }

  if (to && !dateRegex.test(to)) {
    return { error: "Invalid 'to' date format. Use YYYY-MM-DD." };
  }

  const fromIso = from ? `${from}T00:00:00.000Z` : null;
  const toIso = to ? `${to}T23:59:59.999Z` : null;

  return { from, to, fromIso, toIso };
}

function fileName(kind: ReportKind) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${kind}-report-${stamp}.csv`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ report: string }> }) {
  const { report } = await context.params;

  if (!isReportKind(report)) {
    return Response.json({ error: "Unknown report type." }, { status: 404 });
  }

  const userContext = await getCurrentUserContext();

  if (!userContext?.organization || !can(userContext.role, "view_reports")) {
    return Response.json({ error: "You do not have permission to export reports." }, { status: 403 });
  }

  const parsedRange = parseDateRange(request.nextUrl.searchParams);

  if ("error" in parsedRange) {
    return Response.json({ error: parsedRange.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const organizationId = userContext.organization.id;
  let csv = "";
  let rowCount = 0;

  if (report === "compliance") {
    let query = admin
      .from("compliance_controls")
      .select("control_code, title, category, status, due_date, evidence_summary, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false });

    if (parsedRange.fromIso) {
      query = query.gte("updated_at", parsedRange.fromIso);
    }

    if (parsedRange.toIso) {
      query = query.lte("updated_at", parsedRange.toIso);
    }

    const { data, error } = await query.returns<ComplianceExportRow[]>();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    rowCount = data.length;
    csv = toCsv(data, [
      { key: "control_code", label: "Control Code" },
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
      { key: "due_date", label: "Due Date" },
      { key: "evidence_summary", label: "Evidence Summary" },
      { key: "updated_at", label: "Updated At (UTC)" },
    ]);
  }

  if (report === "incidents") {
    let query = admin
      .from("incident_reports")
      .select("title, severity, status, affected_system, detected_at, resolved_at, updated_at")
      .eq("organization_id", organizationId)
      .order("detected_at", { ascending: false });

    if (parsedRange.fromIso) {
      query = query.gte("detected_at", parsedRange.fromIso);
    }

    if (parsedRange.toIso) {
      query = query.lte("detected_at", parsedRange.toIso);
    }

    const { data, error } = await query.returns<IncidentExportRow[]>();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    rowCount = data.length;
    csv = toCsv(data, [
      { key: "title", label: "Title" },
      { key: "severity", label: "Severity" },
      { key: "status", label: "Status" },
      { key: "affected_system", label: "Affected System" },
      { key: "detected_at", label: "Detected At (UTC)" },
      { key: "resolved_at", label: "Resolved At (UTC)" },
      { key: "updated_at", label: "Updated At (UTC)" },
    ]);
  }

  if (report === "audit") {
    let query = admin
      .from("audit_logs")
      .select("action, entity_type, entity_id, actor_user_id, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (parsedRange.fromIso) {
      query = query.gte("created_at", parsedRange.fromIso);
    }

    if (parsedRange.toIso) {
      query = query.lte("created_at", parsedRange.toIso);
    }

    const { data, error } = await query.returns<AuditExportRow[]>();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    rowCount = data.length;
    csv = toCsv(data, [
      { key: "action", label: "Action" },
      { key: "entity_type", label: "Entity Type" },
      { key: "entity_id", label: "Entity Id" },
      { key: "actor_user_id", label: "Actor User Id" },
      { key: "created_at", label: "Created At (UTC)" },
    ]);
  }

  if (report === "risks") {
    let query = admin
      .from("risk_assessments")
      .select("title, category, likelihood, impact, risk_score, status, target_date, updated_at")
      .eq("organization_id", organizationId)
      .order("risk_score", { ascending: false })
      .order("updated_at", { ascending: false });

    if (parsedRange.fromIso) {
      query = query.gte("updated_at", parsedRange.fromIso);
    }

    if (parsedRange.toIso) {
      query = query.lte("updated_at", parsedRange.toIso);
    }

    const { data, error } = await query.returns<RiskExportRow[]>();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    rowCount = data.length;
    csv = toCsv(data, [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "likelihood", label: "Likelihood (1-5)" },
      { key: "impact", label: "Impact (1-5)" },
      { key: "risk_score", label: "Risk Score" },
      { key: "status", label: "Status" },
      { key: "target_date", label: "Target Date" },
      { key: "updated_at", label: "Updated At (UTC)" },
    ]);
  }

  if (report === "baa") {
    let query = admin
      .from("business_associate_agreements")
      .select("vendor_name, contact_email, status, signed_at, renewal_date, document_url, updated_at")
      .eq("organization_id", organizationId)
      .order("renewal_date", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (parsedRange.fromIso) {
      query = query.gte("updated_at", parsedRange.fromIso);
    }

    if (parsedRange.toIso) {
      query = query.lte("updated_at", parsedRange.toIso);
    }

    const { data, error } = await query.returns<BaaExportRow[]>();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    rowCount = data.length;
    csv = toCsv(data, [
      { key: "vendor_name", label: "Vendor Name" },
      { key: "contact_email", label: "Contact Email" },
      { key: "status", label: "Status" },
      { key: "signed_at", label: "Signed Date" },
      { key: "renewal_date", label: "Renewal Date" },
      { key: "document_url", label: "Document URL" },
      { key: "updated_at", label: "Updated At (UTC)" },
    ]);
  }

  if (report === "backup") {
    let query = admin
      .from("backup_records")
      .select("system_name, backup_scope, status, last_success_at, next_scheduled_at, retention_days, updated_at")
      .eq("organization_id", organizationId)
      .order("next_scheduled_at", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (parsedRange.fromIso) {
      query = query.gte("updated_at", parsedRange.fromIso);
    }

    if (parsedRange.toIso) {
      query = query.lte("updated_at", parsedRange.toIso);
    }

    const { data, error } = await query.returns<BackupExportRow[]>();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    rowCount = data.length;
    csv = toCsv(data, [
      { key: "system_name", label: "System Name" },
      { key: "backup_scope", label: "Backup Scope" },
      { key: "status", label: "Status" },
      { key: "last_success_at", label: "Last Success At (UTC)" },
      { key: "next_scheduled_at", label: "Next Scheduled At (UTC)" },
      { key: "retention_days", label: "Retention Days" },
      { key: "updated_at", label: "Updated At (UTC)" },
    ]);
  }

  await logAuditEvent({
    organizationId,
    actorUserId: userContext.user.id,
    action: "report.exported",
    entityType: "report",
    entityId: report,
    metadata: {
      report,
      from: parsedRange.from ?? null,
      to: parsedRange.to ?? null,
      rows: rowCount,
    },
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName(report)}"`,
      "Cache-Control": "no-store",
    },
  });
}
