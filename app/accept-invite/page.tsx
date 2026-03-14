import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { getCurrentUserContext } from "@/lib/auth/context";

export const metadata: Metadata = {
  title: "Accept Invite",
  description: "Accept an organization invitation.",
};

type AcceptInvitePageProps = Readonly<{
  searchParams: Promise<{
    invitation?: string;
  }>;
}>;

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const params = await searchParams;
  const context = await getCurrentUserContext();
  const invitationPath = params.invitation ? `/accept-invite?invitation=${params.invitation}` : "/accept-invite";

  if (!params.invitation) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <div className="rounded-[2rem] border border-border bg-card/90 p-8 shadow-[0_20px_80px_rgba(16,57,61,0.12)]">
          <h1 className="text-3xl font-semibold tracking-tight">Invitation link missing</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Use the invitation email link sent by your organization admin or return to the login page.
          </p>
        </div>
      </main>
    );
  }

  if (!context?.user) {
    redirect(`/login?redirectTo=${encodeURIComponent(invitationPath)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="rounded-[2rem] border border-border bg-card/90 p-8 shadow-[0_20px_80px_rgba(16,57,61,0.12)]">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Invitation</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Join your healthcare security workspace.</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{context.user.email}</span>. Confirm the invitation to
          activate your organization membership.
        </p>
        <div className="mt-8">
          <AcceptInviteForm invitationId={params.invitation} />
        </div>
        <Link className="mt-6 inline-flex text-sm text-muted-foreground underline underline-offset-4" href="/dashboard">
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
