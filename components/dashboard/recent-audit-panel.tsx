import type { AuditLog } from "@/lib/auth/types";

type RecentAuditPanelProps = Readonly<{
  logs: AuditLog[];
}>;

function formatAction(action: string) {
  return action.replaceAll(".", " ");
}

export function RecentAuditPanel({ logs }: RecentAuditPanelProps) {
  return (
    <section className="rounded-[1.5rem] border border-border bg-card/90 p-6 shadow-[0_20px_60px_rgba(16,57,61,0.08)]">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Audit</p>
        <h2 className="text-2xl font-semibold">Recent activity</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Review the latest security-sensitive events captured for your organization.
        </p>
      </div>
      <div className="mt-6 space-y-3">
        {logs.length ? (
          logs.map((log) => (
            <div className="rounded-2xl border border-border bg-background px-4 py-4" key={log.id}>
              <p className="font-medium capitalize">{formatAction(log.action)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {log.entity_type}
                {log.entity_id ? ` | ${log.entity_id}` : ""}
                {` | ${new Date(log.created_at).toLocaleString()}`}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            No audit events recorded yet.
          </p>
        )}
      </div>
    </section>
  );
}
