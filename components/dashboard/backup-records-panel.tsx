"use client";

import { useActionState } from "react";

import { createBackupRecord, updateBackupRecordStatus } from "@/app/actions/backup";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";
import { backupRecordStatuses, type BackupRecordStatus } from "@/lib/validations/backup";

type BackupRecordSummary = {
  id: string;
  system_name: string;
  backup_scope: string;
  status: BackupRecordStatus;
  last_success_at: string | null;
  next_scheduled_at: string | null;
  retention_days: number;
  notes: string | null;
};

type BackupRecordsPanelProps = Readonly<{
  records: BackupRecordSummary[];
}>;

function statusLabel(status: BackupRecordStatus) {
  return status.replaceAll("_", " ");
}

function statusTone(status: BackupRecordStatus) {
  if (status === "successful") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "failed") {
    return "bg-red-100 text-red-800";
  }

  if (status === "running") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-slate-100 text-slate-700";
}

function BackupRow({ record }: Readonly<{ record: BackupRecordSummary }>) {
  const [state, formAction] = useActionState(updateBackupRecordStatus, initialFormState);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{record.system_name}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(record.status)}`}>
              {statusLabel(record.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {record.backup_scope} | retention {record.retention_days} days
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {record.last_success_at ? `last success ${new Date(record.last_success_at).toLocaleString()}` : "no successful run recorded"}
            {record.next_scheduled_at ? ` | next run ${new Date(record.next_scheduled_at).toLocaleString()}` : ""}
          </p>
          {record.notes ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{record.notes}</p> : null}
        </div>
        <form action={formAction} className="flex w-full flex-col gap-2 md:w-auto md:min-w-52">
          <input name="backupId" type="hidden" value={record.id} />
          <select
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
            defaultValue={record.status}
            name="status"
          >
            {backupRecordStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            type="submit"
          >
            Update backup
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}

export function BackupRecordsPanel({ records }: BackupRecordsPanelProps) {
  const [state, formAction] = useActionState(createBackupRecord, initialFormState);

  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Backup</p>
          <h2 className="text-2xl font-semibold">Backup and recovery tracking</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Monitor critical backup scope, run status, retention, and next recovery checkpoints.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-72">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Records</p>
            <p className="mt-2 text-3xl font-semibold">{records.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Successful</p>
            <p className="mt-2 text-3xl font-semibold">{records.filter((record) => record.status === "successful").length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Running</p>
            <p className="mt-2 text-3xl font-semibold">{records.filter((record) => record.status === "running").length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="mt-2 text-3xl font-semibold">{records.filter((record) => record.status === "failed").length}</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="mt-8 grid gap-4 rounded-[1.5rem] border border-border bg-background p-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="systemName">
            System name
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="systemName"
            name="systemName"
            placeholder="Primary EHR database"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="backupScope">
            Backup scope
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="backupScope"
            name="backupScope"
            placeholder="Daily encrypted full snapshot"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="backupStatus">
            Status
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
            defaultValue="scheduled"
            id="backupStatus"
            name="status"
          >
            {backupRecordStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="retentionDays">
            Retention days
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            defaultValue={30}
            id="retentionDays"
            min={1}
            name="retentionDays"
            type="number"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="lastSuccessAt">
            Last success (UTC)
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="lastSuccessAt"
            name="lastSuccessAt"
            type="datetime-local"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="nextScheduledAt">
            Next scheduled (UTC)
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="nextScheduledAt"
            name="nextScheduledAt"
            type="datetime-local"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="backupNotes">
            Notes
          </label>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="backupNotes"
            name="notes"
            placeholder="Capture recovery drill outcomes and exceptions."
          />
        </div>
        <div className="md:col-span-2">
          <SubmitButton pendingLabel="Creating backup record">Create backup record</SubmitButton>
        </div>
        {state.message ? (
          <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </form>

      <div className="mt-6 space-y-4">
        {records.length ? (
          records.map((record) => <BackupRow key={record.id} record={record} />)
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No backup records tracked yet.
          </p>
        )}
      </div>
    </section>
  );
}
