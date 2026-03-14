import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserContext, getPendingInvitationsForUser } from "@/lib/auth/context";

export const metadata: Metadata = {
  title: "Access Pending",
  description: "Membership or invite acceptance is still pending.",
};

export default async function AccessPendingPage() {
  const context = await getCurrentUserContext();

  if (!context?.user.email) {
    redirect("/login");
  }

  if (context.membership) {
    redirect("/dashboard");
  }

  const invitations = await getPendingInvitationsForUser(context.user.email);
  const primaryInvitation = invitations[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="rounded-[2rem] border border-border bg-card/90 p-8 shadow-[0_20px_80px_rgba(16,57,61,0.12)]">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Membership Pending</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Your access is not active yet.</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          We found no active organization membership for <span className="font-medium text-foreground">{context.user.email}</span>.
        </p>
        {primaryInvitation ? (
          <div className="mt-6 rounded-2xl border border-border bg-background px-4 py-4">
            <p className="font-medium">Pending invitation found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Role: {primaryInvitation.role} | expires {new Date(primaryInvitation.expires_at).toLocaleDateString()}
            </p>
            <Link
              className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
              href={`/accept-invite?invitation=${primaryInvitation.id}`}
            >
              Accept invitation
            </Link>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            Ask an organization admin to send you an invite.
          </p>
        )}
      </div>
    </main>
  );
}

