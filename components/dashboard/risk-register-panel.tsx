"use client";

import { useActionState } from "react";

import { createRiskAssessment, updateRiskAssessmentStatus } from "@/app/actions/risks";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";
import { riskAssessmentStatuses, type RiskAssessmentStatus } from "@/lib/validations/risks";

type RiskAssessmentSummary = {
  id: string;
  title: string;
  category: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  status: RiskAssessmentStatus;
  mitigation_plan: string | null;
  target_date: string | null;
};

type RiskRegisterPanelProps = Readonly<{
  risks: RiskAssessmentSummary[];
}>;

function statusLabel(status: RiskAssessmentStatus) {
  return status.replaceAll("_", " ");
}

function scoreTone(score: number) {
  if (score >= 16) {
    return "bg-red-100 text-red-800";
  }

  if (score >= 9) {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-emerald-100 text-emerald-800";
}

function RiskRow({ risk }: Readonly<{ risk: RiskAssessmentSummary }>) {
  const [state, formAction] = useActionState(updateRiskAssessmentStatus, initialFormState);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{risk.title}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${scoreTone(risk.risk_score)}`}>
              score {risk.risk_score}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {risk.category} | likelihood {risk.likelihood}/5 | impact {risk.impact}/5 | {statusLabel(risk.status)}
            {risk.target_date ? ` | target ${new Date(risk.target_date).toLocaleDateString()}` : ""}
          </p>
          {risk.mitigation_plan ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{risk.mitigation_plan}</p>
          ) : null}
        </div>
        <form action={formAction} className="flex w-full flex-col gap-2 md:w-auto md:min-w-52">
          <input name="riskId" type="hidden" value={risk.id} />
          <select
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
            defaultValue={risk.status}
            name="status"
          >
            {riskAssessmentStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            type="submit"
          >
            Update risk
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}

export function RiskRegisterPanel({ risks }: RiskRegisterPanelProps) {
  const [state, formAction] = useActionState(createRiskAssessment, initialFormState);

  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Risk</p>
          <h2 className="text-2xl font-semibold">Risk register</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Identify exposure areas, prioritize by score, and track mitigation progress before audit windows.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-72">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total risks</p>
            <p className="mt-2 text-3xl font-semibold">{risks.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">High score</p>
            <p className="mt-2 text-3xl font-semibold">{risks.filter((risk) => risk.risk_score >= 16).length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Mitigating</p>
            <p className="mt-2 text-3xl font-semibold">
              {risks.filter((risk) => risk.status === "mitigating").length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Closed</p>
            <p className="mt-2 text-3xl font-semibold">{risks.filter((risk) => risk.status === "closed").length}</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="mt-8 grid gap-4 rounded-[1.5rem] border border-border bg-background p-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="riskTitle">
            Risk title
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="riskTitle"
            name="title"
            placeholder="Unrestricted access to exported PHI snapshots"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="riskCategory">
            Category
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="riskCategory"
            name="category"
            placeholder="Access control"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="targetDate">
            Target date
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="targetDate"
            name="targetDate"
            type="date"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="likelihood">
            Likelihood
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
            defaultValue="3"
            id="likelihood"
            name="likelihood"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="impact">
            Impact
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
            defaultValue="3"
            id="impact"
            name="impact"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="mitigationPlan">
            Mitigation plan
          </label>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="mitigationPlan"
            name="mitigationPlan"
            placeholder="Document containment and long-term corrective actions."
          />
        </div>
        <div className="md:col-span-2">
          <SubmitButton pendingLabel="Adding risk">Add risk</SubmitButton>
        </div>
        {state.message ? (
          <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </form>

      <div className="mt-6 space-y-4">
        {risks.length ? (
          risks.map((risk) => <RiskRow key={risk.id} risk={risk} />)
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No risks added yet.
          </p>
        )}
      </div>
    </section>
  );
}
