"use client";

import { useActionState } from "react";

import { createBaa, updateBaaStatus } from "@/app/actions/baa";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";
import { baaStatuses, type BaaStatus } from "@/lib/validations/baa";

type BaaSummary = {
  id: string;
  vendor_name: string;
  contact_email: string | null;
  status: BaaStatus;
  signed_at: string | null;
  renewal_date: string | null;
  document_url: string | null;
  notes: string | null;
};

type BaaPanelProps = Readonly<{
  records: BaaSummary[];
}>;

function statusLabel(status: BaaStatus) {
  return status.replaceAll("_", " ");
}

function statusTone(status: BaaStatus) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "expired" || status === "terminated") {
    return "bg-red-100 text-red-800";
  }

  return "bg-slate-100 text-slate-700";
}

function BaaRow({ record }: Readonly<{ record: BaaSummary }>) {
  const [state, formAction] = useActionState(updateBaaStatus, initialFormState);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{record.vendor_name}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(record.status)}`}>
              {statusLabel(record.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {record.contact_email ?? "No contact email"}
            {record.signed_at ? ` | signed ${new Date(record.signed_at).toLocaleDateString()}` : ""}
            {record.renewal_date ? ` | renew ${new Date(record.renewal_date).toLocaleDateString()}` : ""}
          </p>
          {record.document_url ? (
            <a
              className="mt-2 inline-flex text-sm text-muted-foreground underline underline-offset-4"
              href={record.document_url}
              rel="noreferrer"
              target="_blank"
            >
              View agreement document
            </a>
          ) : null}
          {record.notes ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{record.notes}</p> : null}
        </div>
        <form action={formAction} className="flex w-full flex-col gap-2 md:w-auto md:min-w-52">
          <input name="baaId" type="hidden" value={record.id} />
          <select
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
            defaultValue={record.status}
            name="status"
          >
            {baaStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            type="submit"
          >
            Update BAA
          </button>
        </form>
      </div>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}

export function BaaPanel({ records }: BaaPanelProps) {
  const [state, formAction] = useActionState(createBaa, initialFormState);
  const expiringSoonCount = records.filter((record) => {
    if (!record.renewal_date) {
      return false;
    }

    const renewal = new Date(record.renewal_date).getTime();
    const now = Date.now();
    const windowEnd = now + 30 * 24 * 60 * 60 * 1000;
    return renewal >= now && renewal <= windowEnd;
  }).length;

  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">BAA</p>
          <h2 className="text-2xl font-semibold">Business Associate Agreements</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Track vendor agreements, signature timelines, and renewal posture for HIPAA compliance.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-72">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="mt-2 text-3xl font-semibold">{records.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="mt-2 text-3xl font-semibold">{records.filter((record) => record.status === "active").length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Expiring 30d</p>
            <p className="mt-2 text-3xl font-semibold">{expiringSoonCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Expired</p>
            <p className="mt-2 text-3xl font-semibold">{records.filter((record) => record.status === "expired").length}</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="mt-8 grid gap-4 rounded-[1.5rem] border border-border bg-background p-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="vendorName">
            Vendor
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="vendorName"
            name="vendorName"
            placeholder="Acme EHR Services"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="contactEmail">
            Contact email
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="contactEmail"
            name="contactEmail"
            placeholder="legal@vendor.com"
            type="email"
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
            {baaStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="signedAt">
            Signed date
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="signedAt"
            name="signedAt"
            type="date"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="renewalDate">
            Renewal date
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="renewalDate"
            name="renewalDate"
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
          <label className="text-sm font-medium" htmlFor="notes">
            Notes
          </label>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
            id="notes"
            name="notes"
            placeholder="Add legal review notes or exceptions."
          />
        </div>
        <div className="md:col-span-2">
          <SubmitButton pendingLabel="Creating BAA">Create BAA</SubmitButton>
        </div>
        {state.message ? (
          <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </form>

      <div className="mt-6 space-y-4">
        {records.length ? (
          records.map((record) => <BaaRow key={record.id} record={record} />)
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No BAA records added yet.
          </p>
        )}
      </div>
    </section>
  );
}
