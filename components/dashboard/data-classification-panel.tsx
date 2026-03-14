"use client";

import { useActionState } from "react";

import { createDataClassification, updateDataClassificationLevel } from "@/app/actions/classifications";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";
import { dataClassificationLevels, type DataClassificationLevel } from "@/lib/validations/classifications";

type DataClassificationSummary = {
  id: string;
  asset_name: string;
  data_type: string;
  classification_level: DataClassificationLevel;
  contains_phi: boolean;
  contains_pii: boolean;
  encryption_required: boolean;
  retention_days: number | null;
  notes: string | null;
};

type DataClassificationPanelProps = Readonly<{
  records: DataClassificationSummary[];
}>;

function levelLabel(level: DataClassificationLevel) {
  return level.replaceAll("_", " ");
}

function levelTone(level: DataClassificationLevel) {
  if (level === "phi_restricted") {
    return "bg-red-100 text-red-800";
  }

  if (level === "confidential") {
    return "bg-amber-100 text-amber-900";
  }

  if (level === "internal") {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-emerald-100 text-emerald-800";
}

function ClassificationRow({ record }: Readonly<{ record: DataClassificationSummary }>) {
  const [state, formAction] = useActionState(updateDataClassificationLevel, initialFormState);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{record.asset_name}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${levelTone(record.classification_level)}`}>
              {levelLabel(record.classification_level)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {record.data_type}
            {record.retention_days ? ` | retention ${record.retention_days} days` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {record.contains_phi ? "PHI" : "No PHI"} | {record.contains_pii ? "PII" : "No PII"} |{" "}
            {record.encryption_required ? "Encryption required" : "Encryption optional"}
          </p>
          {record.notes ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{record.notes}</p> : null}
        </div>
        <form action={formAction} className="flex w-full flex-col gap-2 md:w-auto md:min-w-64">
          <input name="classificationId" type="hidden" value={record.id} />
          <select
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
            defaultValue={record.classification_level}
            name="classificationLevel"
          >
            {dataClassificationLevels.map((level) => (
              <option key={level} value={level}>
                {levelLabel(level)}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <input defaultChecked={record.encryption_required} name="encryptionRequired" type="checkbox" value="true" />
            Require encryption
          </label>
          <button
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            type="submit"
          >
            Update classification
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}

export function DataClassificationPanel({ records }: DataClassificationPanelProps) {
  const [state, formAction] = useActionState(createDataClassification, initialFormState);

  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Data Classification</p>
          <h2 className="text-2xl font-semibold">Sensitive data baseline</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Classify organization data assets by sensitivity and enforce encryption expectations.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-72">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Assets</p>
            <p className="mt-2 text-3xl font-semibold">{records.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">PHI tagged</p>
            <p className="mt-2 text-3xl font-semibold">{records.filter((record) => record.contains_phi).length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Confidential+</p>
            <p className="mt-2 text-3xl font-semibold">
              {records.filter((record) => record.classification_level === "confidential" || record.classification_level === "phi_restricted").length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Encrypted</p>
            <p className="mt-2 text-3xl font-semibold">{records.filter((record) => record.encryption_required).length}</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="mt-8 grid gap-4 rounded-[1.5rem] border border-border bg-background p-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="assetName">
            Asset name
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="assetName"
            name="assetName"
            placeholder="EHR Encounter Export"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="dataType">
            Data type
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="dataType"
            name="dataType"
            placeholder="CSV export"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="classificationLevel">
            Classification level
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
            defaultValue="internal"
            id="classificationLevel"
            name="classificationLevel"
          >
            {dataClassificationLevels.map((level) => (
              <option key={level} value={level}>
                {levelLabel(level)}
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
            id="retentionDays"
            min={1}
            name="retentionDays"
            placeholder="90"
            type="number"
          />
        </div>
        <div className="flex flex-wrap gap-4 md:col-span-2">
          <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <input name="containsPhi" type="checkbox" value="true" />
            Contains PHI
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <input name="containsPii" type="checkbox" value="true" />
            Contains PII
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <input defaultChecked name="encryptionRequired" type="checkbox" value="true" />
            Encryption required
          </label>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="notes">
            Notes
          </label>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="notes"
            name="notes"
            placeholder="Describe handling requirements and exceptions."
          />
        </div>
        <div className="md:col-span-2">
          <SubmitButton pendingLabel="Creating classification">Create classification</SubmitButton>
        </div>
        {state.message ? (
          <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </form>

      <div className="mt-6 space-y-4">
        {records.length ? (
          records.map((record) => <ClassificationRow key={record.id} record={record} />)
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No data classifications added yet.
          </p>
        )}
      </div>
    </section>
  );
}

