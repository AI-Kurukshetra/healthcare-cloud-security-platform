import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MfaEnrollmentForm } from "@/components/auth/mfa-enrollment-form";
import { getCurrentUserContext } from "@/lib/auth/context";

export const metadata: Metadata = {
  title: "MFA Setup",
  description: "Set up MFA for privileged access.",
};

export default async function MfaSetupPage() {
  const context = await getCurrentUserContext();

  if (!context?.user) {
    redirect("/login");
  }

  if (!context.needsMfa) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <div className="rounded-[2rem] border border-border bg-card/90 p-8 shadow-[0_20px_80px_rgba(16,57,61,0.12)]">
        <MfaEnrollmentForm isRequired={context.needsMfa} />
      </div>
    </main>
  );
}
