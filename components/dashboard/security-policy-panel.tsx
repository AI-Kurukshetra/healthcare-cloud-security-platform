"use client";

import { useActionState } from "react";

import { createSecurityPolicy, updateSecurityPolicyStatus } from "@/app/actions/policies";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";
import { securityPolicyStatuses, type SecurityPolicyStatus } from "@/lib/validations/policies";

type SecurityPolicySummary = {
  id: string;
  policy_name: string;
  category: string;
  version: string;
  status: SecurityPolicyStatus;
  effective_date: string | null;
  next_review_date: string | null;
  document_url: string | null;
  summary: string | null;
};

type SecurityPolicyPanelProps = Readonly<{
  policies: SecurityPolicySummary[];
}>;

function statusLabel(status: SecurityPolicyStatus) {
  return status.replaceAll("_", " ");
}

function statusTone(status: SecurityPolicyStatus) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "needs_review") {
    return "bg-amber-100 text-amber-900";
  }

  if (status === "retired") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-slate-100 text-slate-700";
}

function PolicyRow({ policy }: Readonly<{ policy: SecurityPolicySummary }>) {
  const [state, formAction] = useActionState(updateSecurityPolicyStatus, initialFormState);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{policy.policy_name}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(policy.status)}`}>
              {statusLabel(policy.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {policy.category} | v{policy.version}
            {policy.effective_date ? ` | effective ${new Date(policy.effective_date).toLocaleDateString()}` : ""}
            {policy.next_review_date ? ` | next review ${new Date(policy.next_review_date).toLocaleDateString()}` : ""}
          </p>
          {policy.summary ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{policy.summary}</p> : null}
          {policy.document_url ? (
            <a
              className="mt-2 inline-flex text-sm text-muted-foreground underline underline-offset-4"
              href={policy.document_url}
              rel="noreferrer"
              target="_blank"
            >
              View policy document
            </a>
          ) : null}
        </div>
        <form action={formAction} className="flex w-full flex-col gap-2 md:w-auto md:min-w-52">
          <input name="policyId" type="hidden" value={policy.id} />
          <select
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
            defaultValue={policy.status}
            name="status"
          >
            {securityPolicyStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            type="submit"
          >
            Update policy
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}

export function SecurityPolicyPanel({ policies }: SecurityPolicyPanelProps) {
  const [state, formAction] = useActionState(createSecurityPolicy, initialFormState);
  const needsReviewCount = policies.filter((policy) => policy.status === "needs_review").length;
  const reviewWindowCount = policies.filter((policy) => {
    if (!policy.next_review_date || policy.status === "retired") {
      return false;
    }

    const reviewDate = new Date(policy.next_review_date).getTime();
    const now = Date.now();
    const windowEnd = now + 30 * 24 * 60 * 60 * 1000;
    return reviewDate >= now && reviewDate <= windowEnd;
  }).length;

  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Policies</p>
          <h2 className="text-2xl font-semibold">Security policies</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Maintain policy versions, track review cycles, and keep security guidance audit-ready.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-72">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="mt-2 text-3xl font-semibold">{policies.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="mt-2 text-3xl font-semibold">{policies.filter((policy) => policy.status === "active").length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Needs review</p>
            <p className="mt-2 text-3xl font-semibold">{needsReviewCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Review 30d</p>
            <p className="mt-2 text-3xl font-semibold">{reviewWindowCount}</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="mt-8 grid gap-4 rounded-[1.5rem] border border-border bg-background p-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="policyName">
            Policy name
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="policyName"
            name="policyName"
            placeholder="Access Control Standard"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="category">
            Category
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="category"
            name="category"
            placeholder="Identity and Access"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="version">
            Version
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            defaultValue="1.0"
            id="version"
            name="version"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="status">
            Status
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
            defaultValue="draft"
            id="status"
            name="status"
          >
            {securityPolicyStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="effectiveDate">
            Effective date
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="effectiveDate"
            name="effectiveDate"
            type="date"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="nextReviewDate">
            Next review
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="nextReviewDate"
            name="nextReviewDate"
            type="date"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="documentUrl">
            Document URL
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="documentUrl"
            name="documentUrl"
            placeholder="https://..."
            type="url"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="summary">
            Summary
          </label>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="summary"
            name="summary"
            placeholder="Describe key controls and ownership expectations."
          />
        </div>
        <div className="md:col-span-2">
          <SubmitButton pendingLabel="Creating policy">Create policy</SubmitButton>
        </div>
        {state.message ? (
          <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </form>

      <div className="mt-6 space-y-4">
        {policies.length ? (
          policies.map((policy) => <PolicyRow key={policy.id} policy={policy} />)
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No security policies added yet.
          </p>
        )}
      </div>
    </section>
  );
}

