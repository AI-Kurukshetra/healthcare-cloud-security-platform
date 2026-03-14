"use client";

import { useActionState } from "react";

import { createComplianceControl, updateComplianceControlStatus } from "@/app/actions/compliance";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";
import { complianceControlStatuses, type ComplianceControlStatus } from "@/lib/validations/compliance";

type ComplianceControlSummary = {
  id: string;
  control_code: string;
  title: string;
  category: string;
  status: ComplianceControlStatus;
  due_date: string | null;
  evidence_summary: string | null;
};

type ComplianceControlPanelProps = Readonly<{
  controls: ComplianceControlSummary[];
  overdueCount: number;
}>;

function statusLabel(status: ComplianceControlStatus) {
  return status.replaceAll("_", " ");
}

function statusTone(status: ComplianceControlStatus) {
  if (status === "compliant") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "at_risk") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-slate-100 text-slate-700";
}

function ControlRow({ control }: Readonly<{ control: ComplianceControlSummary }>) {
  const [state, formAction] = useActionState(updateComplianceControlStatus, initialFormState);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{control.control_code}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusTone(control.status)}`}>
              {statusLabel(control.status)}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{control.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {control.category}
            {control.due_date ? ` | due ${new Date(control.due_date).toLocaleDateString()}` : ""}
          </p>
          {control.evidence_summary ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{control.evidence_summary}</p>
          ) : null}
        </div>
        <form action={formAction} className="flex w-full flex-col gap-2 md:w-auto md:min-w-52">
          <input name="controlId" type="hidden" value={control.id} />
          <select
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
            defaultValue={control.status}
            name="status"
          >
            {complianceControlStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            type="submit"
          >
            Update status
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}

export function ComplianceControlPanel({ controls, overdueCount }: ComplianceControlPanelProps) {
  const [state, formAction] = useActionState(createComplianceControl, initialFormState);
  const compliantCount = controls.filter((control) => control.status === "compliant").length;

  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Compliance</p>
          <h2 className="text-2xl font-semibold">HIPAA controls</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Track safeguard controls, evidence, and deadlines for your next review cycle.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-72">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Controls</p>
            <p className="mt-2 text-3xl font-semibold">{controls.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Compliant</p>
            <p className="mt-2 text-3xl font-semibold">{compliantCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="mt-2 text-3xl font-semibold">{overdueCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Needs review</p>
            <p className="mt-2 text-3xl font-semibold">
              {controls.filter((control) => control.status === "needs_review").length}
            </p>
          </div>
        </div>
      </div>

      <form action={formAction} className="mt-8 grid gap-4 rounded-[1.5rem] border border-border bg-background p-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="controlCode">
            Control code
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="controlCode"
            name="controlCode"
            placeholder="164.308(a)(1)"
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
            placeholder="Administrative safeguards"
            type="text"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="title">
            Title
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="title"
            name="title"
            placeholder="Security management process"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="dueDate">
            Due date
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="dueDate"
            name="dueDate"
            type="date"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="evidenceSummary">
            Evidence summary
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="evidenceSummary"
            name="evidenceSummary"
            placeholder="Policy revision approved by leadership"
            type="text"
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
            placeholder="Capture remediation details or audit preparation notes."
          />
        </div>
        <div className="md:col-span-2">
          <SubmitButton pendingLabel="Creating control">Create control</SubmitButton>
        </div>
        {state.message ? (
          <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </form>

      <div className="mt-6 space-y-4">
        {controls.length ? (
          controls.map((control) => <ControlRow control={control} key={control.id} />)
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No controls added yet.
          </p>
        )}
      </div>
    </section>
  );
}
