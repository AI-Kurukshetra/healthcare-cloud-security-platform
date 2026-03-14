import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Invite-only access information.",
};

export default function RegisterPage() {
  return (
    <div className="flex h-full min-h-[28rem] flex-col justify-center space-y-5">
      <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Register</p>
      <h2 className="text-3xl font-semibold tracking-tight">This platform uses invite-only onboarding.</h2>
      <p className="max-w-lg text-sm leading-7 text-muted-foreground">
        New organizations and users are provisioned by an existing organization admin. If you expected access, contact your
        administrator for an invitation email.
      </p>
    </div>
  );
}
