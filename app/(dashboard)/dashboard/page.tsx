import type { Metadata } from "next";

import { signOut } from "@/app/actions/auth";
import { InviteMemberForm } from "@/components/dashboard/invite-member-form";
import { ComplianceControlPanel } from "@/components/dashboard/compliance-control-panel";
import { IncidentResponsePanel } from "@/components/dashboard/incident-response-panel";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { MemberAccessPanel } from "@/components/dashboard/member-access-panel";
import { RecentAuditPanel } from "@/components/dashboard/recent-audit-panel";
import { RiskRegisterPanel } from "@/components/dashboard/risk-register-panel";
import { TrainingRecordsPanel } from "@/components/dashboard/training-records-panel";
import { BaaPanel } from "@/components/dashboard/baa-panel";
import { BackupRecordsPanel } from "@/components/dashboard/backup-records-panel";
import { SecurityPolicyPanel } from "@/components/dashboard/security-policy-panel";
import { getCurrentUserContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import type {
  AuditLog,
  BackupRecord,
  BusinessAssociateAgreement,
  ComplianceControl,
  IncidentReport,
  RiskAssessment,
  SecurityPolicy,
  TrainingRecord,
} from "@/lib/auth/types";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Protected dashboard for compliance and access oversight.",
};

export default async function DashboardPage() {
  const context = await getCurrentUserContext();
  const supabase = await createServerClient();
  const organizationId = context?.organization?.id ?? "";
  const canViewTeam = can(context?.role ?? null, "view_team_roster");
  const canManageRoles = can(context?.role ?? null, "manage_roles");
  const canInvite = can(context?.role ?? null, "invite_users");
  const canManageCompliance = can(context?.role ?? null, "manage_compliance");
  const canManageIncidents = can(context?.role ?? null, "manage_incidents");
  const canViewAuditLogs = can(context?.role ?? null, "view_audit_logs");
  const canViewReports = can(context?.role ?? null, "view_reports");
  const canManageTraining = can(context?.role ?? null, "manage_compliance");

  const { data: members } = canViewTeam
    ? await supabase
        .from("organization_memberships")
        .select("id, user_id, role, status, profiles(email, full_name)")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .returns<
          Array<{
            id: string;
            user_id: string;
            role: "org_admin" | "compliance_manager" | "staff";
            status: string;
            profiles: {
              email: string;
              full_name: string | null;
            } | null;
          }>
        >()
    : { data: [] };

  const { data: invitations } = canViewTeam
    ? await supabase
        .from("invitations")
        .select("id, email, role, status, expires_at")
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .returns<
          Array<{
            id: string;
            email: string;
            role: "org_admin" | "compliance_manager" | "staff";
            status: string;
            expires_at: string;
          }>
        >()
    : { data: [] };

  const { data: controls } = canManageCompliance
    ? await supabase
        .from("compliance_controls")
        .select("id, organization_id, control_code, title, category, status, due_date, evidence_summary")
        .eq("organization_id", organizationId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .returns<ComplianceControl[]>()
    : { data: [] };

  const { data: incidents } = canManageIncidents
    ? await supabase
        .from("incident_reports")
        .select("id, organization_id, title, severity, status, affected_system, summary, detected_at")
        .eq("organization_id", organizationId)
        .order("detected_at", { ascending: false })
        .returns<IncidentReport[]>()
    : { data: [] };

  const { data: risks } = canManageCompliance
    ? await supabase
        .from("risk_assessments")
        .select("id, organization_id, title, category, likelihood, impact, risk_score, status, mitigation_plan, target_date")
        .eq("organization_id", organizationId)
        .order("risk_score", { ascending: false })
        .order("target_date", { ascending: true, nullsFirst: false })
        .returns<RiskAssessment[]>()
    : { data: [] };

  const { data: securityPolicies } = canManageCompliance
    ? await supabase
        .from("security_policies")
        .select("id, organization_id, policy_name, category, version, status, effective_date, next_review_date, document_url, summary")
        .eq("organization_id", organizationId)
        .order("next_review_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .returns<SecurityPolicy[]>()
    : { data: [] };

  const { data: trainingRecords } = context?.organization
    ? await supabase
        .from("training_records")
        .select("id, organization_id, title, description, assigned_user_id, due_date, status, completed_at, completion_notes")
        .eq("organization_id", organizationId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .returns<TrainingRecord[]>()
    : { data: [] };

  const { data: baas } = canManageCompliance
    ? await supabase
        .from("business_associate_agreements")
        .select("id, organization_id, vendor_name, contact_email, status, signed_at, renewal_date, document_url, notes")
        .eq("organization_id", organizationId)
        .order("renewal_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .returns<BusinessAssociateAgreement[]>()
    : { data: [] };

  const { data: backups } = canManageCompliance
    ? await supabase
        .from("backup_records")
        .select("id, organization_id, system_name, backup_scope, status, last_success_at, next_scheduled_at, retention_days, notes")
        .eq("organization_id", organizationId)
        .order("next_scheduled_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .returns<BackupRecord[]>()
    : { data: [] };

  const { data: auditLogs } = canViewAuditLogs
    ? await supabase
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(6)
        .returns<AuditLog[]>()
    : { data: [] };

  const overdueCount =
    controls?.filter(
      (control) =>
        Boolean(control.due_date) &&
        new Date(control.due_date as string).getTime() < Date.now() &&
        control.status !== "compliant",
    ).length ?? 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16">
      <section className="flex flex-col gap-6 rounded-[2rem] border border-border bg-card/80 p-8 shadow-[0_20px_80px_rgba(16,57,61,0.12)] md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Protected Area</p>
          <h1 className="text-5xl font-semibold tracking-tight">Security operations dashboard</h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            Signed in as {context?.profile?.full_name ?? context?.user.email} with the role{" "}
            <span className="font-medium text-foreground">{context?.role}</span>.
          </p>
        </div>
        <LogoutButton action={signOut} />
      </section>

      <section className="grid gap-6 md:grid-cols-4">
        <article className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
          <h2 className="text-2xl font-semibold">Organization</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {context?.organization?.name} | {context?.organization?.organization_type}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
          <h2 className="text-2xl font-semibold">MFA level</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{context?.aal ?? "aal1"}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
          <h2 className="text-2xl font-semibold">Open incidents</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {incidents?.filter((incident) => incident.status !== "closed").length ?? 0} tracked across the organization.
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
          <h2 className="text-2xl font-semibold">Controls at risk</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {controls?.filter((control) => control.status === "at_risk").length ?? 0} controls need escalation.
          </p>
        </article>
      </section>

      {canViewReports ? (
        <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Reports</p>
              <h2 className="mt-2 text-2xl font-semibold">Export center</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Download CSV reports for compliance controls, incidents, risk register entries, and audit logs.
              </p>
            </div>
            <a
              className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              href="/dashboard/reports"
            >
              Open reports
            </a>
          </div>
        </section>
      ) : null}

      {canInvite ? <InviteMemberForm /> : null}

      {canViewTeam ? (
        <MemberAccessPanel
          canInviteUsers={canInvite}
          canManageRoles={canManageRoles}
          currentUserId={context?.user.id ?? ""}
          invitations={invitations ?? []}
          members={members ?? []}
        />
      ) : null}

      {canManageCompliance ? <ComplianceControlPanel controls={controls ?? []} overdueCount={overdueCount} /> : null}
      {canManageCompliance ? <SecurityPolicyPanel policies={securityPolicies ?? []} /> : null}
      {canManageCompliance ? <BaaPanel records={baas ?? []} /> : null}
      {canManageCompliance ? <BackupRecordsPanel records={backups ?? []} /> : null}
      {canManageCompliance ? <RiskRegisterPanel risks={risks ?? []} /> : null}
      {canManageTraining || (trainingRecords?.length ?? 0) > 0 ? (
        <TrainingRecordsPanel
          canManageTraining={canManageTraining}
          currentUserId={context?.user.id ?? ""}
          members={members ?? []}
          records={trainingRecords ?? []}
        />
      ) : null}
      {canManageIncidents ? <IncidentResponsePanel incidents={incidents ?? []} /> : null}
      {canViewAuditLogs ? <RecentAuditPanel logs={auditLogs ?? []} /> : null}
    </main>
  );
}
