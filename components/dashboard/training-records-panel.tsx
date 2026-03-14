"use client";

import { useActionState } from "react";

import { completeTrainingRecord, createTrainingRecord, updateTrainingRecordStatus } from "@/app/actions/training";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialFormState } from "@/lib/forms/form-state";
import { trainingRecordStatuses, type TrainingRecordStatus } from "@/lib/validations/training";

type TeamMember = {
  user_id: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
};

type TrainingRecordSummary = {
  id: string;
  title: string;
  description: string | null;
  assigned_user_id: string;
  due_date: string | null;
  status: TrainingRecordStatus;
  completed_at: string | null;
  completion_notes: string | null;
};

type TrainingRecordsPanelProps = Readonly<{
  records: TrainingRecordSummary[];
  members: TeamMember[];
  currentUserId: string;
  canManageTraining: boolean;
}>;

function statusLabel(status: TrainingRecordStatus) {
  return status.replaceAll("_", " ");
}

function statusTone(status: TrainingRecordStatus) {
  if (status === "completed") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "overdue") {
    return "bg-red-100 text-red-800";
  }

  if (status === "in_progress") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-slate-100 text-slate-700";
}

function TrainingRow({
  record,
  assigneeLabel,
  canUpdate,
}: Readonly<{
  record: TrainingRecordSummary;
  assigneeLabel: string;
  canUpdate: boolean;
}>) {
  const [updateState, updateAction] = useActionState(updateTrainingRecordStatus, initialFormState);
  const [completeState, completeAction] = useActionState(completeTrainingRecord, initialFormState);
  const isCompleted = record.status === "completed";

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{record.title}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(record.status)}`}>
              {statusLabel(record.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Assigned to {assigneeLabel}
            {record.due_date ? ` | due ${new Date(record.due_date).toLocaleDateString()}` : ""}
            {record.completed_at ? ` | completed ${new Date(record.completed_at).toLocaleDateString()}` : ""}
          </p>
          {record.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{record.description}</p> : null}
          {record.completion_notes ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Notes: {record.completion_notes}</p>
          ) : null}
        </div>
        {canUpdate ? (
          <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-72">
            <form action={updateAction} className="flex flex-col gap-2">
              <input name="trainingRecordId" type="hidden" value={record.id} />
              <select
                className="rounded-full border border-border bg-card px-4 py-2 text-sm"
                defaultValue={record.status}
                name="status"
              >
                {trainingRecordStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              <input
                className="rounded-full border border-border bg-card px-4 py-2 text-sm"
                name="completionNotes"
                placeholder="Optional completion notes"
                type="text"
              />
              <button
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
                type="submit"
              >
                Save status
              </button>
            </form>
            {!isCompleted ? (
              <form action={completeAction}>
                <input name="trainingRecordId" type="hidden" value={record.id} />
                <button
                  className="w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  type="submit"
                >
                  Mark complete
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
      {updateState.message ? (
        <p className={`mt-3 text-sm ${updateState.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>
          {updateState.message}
        </p>
      ) : null}
      {completeState.message ? (
        <p className={`mt-3 text-sm ${completeState.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>
          {completeState.message}
        </p>
      ) : null}
    </div>
  );
}

export function TrainingRecordsPanel({ records, members, currentUserId, canManageTraining }: TrainingRecordsPanelProps) {
  const [state, formAction] = useActionState(createTrainingRecord, initialFormState);
  const memberLabelById = new Map(
    members.map((member) => [member.user_id, member.profiles?.full_name ?? member.profiles?.email ?? member.user_id]),
  );
  const overdueCount = records.filter(
    (record) => Boolean(record.due_date) && new Date(record.due_date as string).getTime() < Date.now() && record.status !== "completed",
  ).length;

  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Training</p>
          <h2 className="text-2xl font-semibold">Training records</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Track HIPAA and security training assignments, due dates, and completion progress.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-72">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Assignments</p>
            <p className="mt-2 text-3xl font-semibold">{records.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="mt-2 text-3xl font-semibold">{records.filter((record) => record.status === "completed").length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">In progress</p>
            <p className="mt-2 text-3xl font-semibold">{records.filter((record) => record.status === "in_progress").length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="mt-2 text-3xl font-semibold">{overdueCount}</p>
          </div>
        </div>
      </div>

      {canManageTraining ? (
        <form action={formAction} className="mt-8 grid gap-4 rounded-[1.5rem] border border-border bg-background p-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="trainingTitle">
              Training title
            </label>
            <input
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
              id="trainingTitle"
              name="title"
              placeholder="Annual HIPAA security awareness"
              type="text"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="assignedUserId">
              Assignee
            </label>
            <select
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
              id="assignedUserId"
              name="assignedUserId"
              required
            >
              <option value="">Select team member</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profiles?.full_name ?? member.profiles?.email ?? member.user_id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="trainingDueDate">
              Due date
            </label>
            <input
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
              id="trainingDueDate"
              name="dueDate"
              type="date"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="trainingDescription">
              Description
            </label>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none transition focus:border-primary"
              id="trainingDescription"
              name="description"
              placeholder="Required annual training for staff that handles PHI."
            />
          </div>
          <div className="md:col-span-2">
            <SubmitButton pendingLabel="Assigning training">Assign training</SubmitButton>
          </div>
          {state.message ? (
            <p className={`text-sm md:col-span-2 ${state.status === "error" ? "text-red-700" : "text-muted-foreground"}`}>
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}

      <div className="mt-6 space-y-4">
        {records.length ? (
          records.map((record) => (
            <TrainingRow
              assigneeLabel={record.assigned_user_id === currentUserId ? "you" : (memberLabelById.get(record.assigned_user_id) ?? record.assigned_user_id)}
              canUpdate={canManageTraining || record.assigned_user_id === currentUserId}
              key={record.id}
              record={record}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No training records assigned yet.
          </p>
        )}
      </div>
    </section>
  );
}

