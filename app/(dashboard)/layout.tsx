import { redirect } from "next/navigation";

import { getCurrentUserContext } from "@/lib/auth/context";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const context = await getCurrentUserContext();

  if (!context?.user) {
    redirect("/login");
  }

  if (!context.membership) {
    redirect("/access-pending");
  }

  if (context.needsMfa) {
    redirect("/mfa-setup");
  }

  return <div className="min-h-screen bg-transparent">{children}</div>;
}
