"use client";

import { useActionState } from "react";

import { createIncident, updateIncidentStatus } from "@/app/actions/incidents";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";
import { incidentSeverities, incidentStatuses, type IncidentSeverity, type IncidentStatus } from "@/lib/validations/incidents";

type IncidentSummary = {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affected_system: string | null;
  summary: string;
  detected_at: string;
};

type IncidentResponsePanelProps = Readonly<{
  incidents: IncidentSummary[];
}>;

function severityTone(severity: IncidentSeverity) {
  if (severity === "critical") {
    return "bg-red-100 text-red-800";
  }

  if (severity === "high") {
    return "bg-orange-100 text-orange-800";
  }

  if (severity === "medium") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-emerald-100 text-emerald-800";
}

function statusLabel(status: IncidentStatus) {
  return status.replaceAll("_", " ");
}

function IncidentRow({ incident }: Readonly<{ incident: IncidentSummary }>) {
  const [state, formAction] = useActionState(updateIncidentStatus, initialFormState);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{incident.title}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${severityTone(incident.severity)}`}>
              {incident.severity}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {statusLabel(incident.status)}
            {incident.affected_system ? ` | ${incident.affected_system}` : ""}
            {` | detected ${new Date(incident.detected_at).toLocaleDateString()}`}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{incident.summary}</p>
        </div>
        <form action={formAction} className="flex w-full flex-col gap-2 md:w-auto md:min-w-52">
          <input name="incidentId" type="hidden" value={incident.id} />
          <select
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
            defaultValue={incident.status}
            name="status"
          >
            {incidentStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            type="submit"
          >
            Update incident
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}

export function IncidentResponsePanel({ incidents }: IncidentResponsePanelProps) {
  const [state, formAction] = useActionState(createIncident, initialFormState);

  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Incidents</p>
          <h2 className="text-2xl font-semibold">Response tracker</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Capture operational issues, assign severity, and move work through investigation and closure.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-72">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="mt-2 text-3xl font-semibold">
              {incidents.filter((incident) => incident.status === "open" || incident.status === "investigating").length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Critical</p>
            <p className="mt-2 text-3xl font-semibold">
              {incidents.filter((incident) => incident.severity === "critical").length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Contained</p>
            <p className="mt-2 text-3xl font-semibold">
              {incidents.filter((incident) => incident.status === "contained").length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Closed</p>
            <p className="mt-2 text-3xl font-semibold">
              {incidents.filter((incident) => incident.status === "closed").length}
            </p>
          </div>
        </div>
      </div>

      <form action={formAction} className="mt-8 grid gap-4 rounded-[1.5rem] border border-border bg-background p-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="incidentTitle">
            Incident title
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="incidentTitle"
            name="title"
            placeholder="Unexpected PHI export activity"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="severity">
            Severity
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
            id="severity"
            name="severity"
            defaultValue="medium"
          >
            {incidentSeverities.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="affectedSystem">
            Affected system
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="affectedSystem"
            name="affectedSystem"
            placeholder="EHR integration"
            type="text"
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
            placeholder="Describe what happened, how it was detected, and the likely impact."
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="responseNotes">
            Response notes
          </label>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="responseNotes"
            name="responseNotes"
            placeholder="Capture immediate containment and follow-up steps."
          />
        </div>
        <div className="md:col-span-2">
          <SubmitButton pendingLabel="Logging incident">Log incident</SubmitButton>
        </div>
        {state.message ? (
          <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </form>

      <div className="mt-6 space-y-4">
        {incidents.length ? (
          incidents.map((incident) => <IncidentRow incident={incident} key={incident.id} />)
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No incidents logged yet.
          </p>
        )}
      </div>
    </section>
  );
}
