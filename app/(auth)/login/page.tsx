import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to the healthcare project.",
};

type LoginPageProps = Readonly<{
  searchParams: Promise<{
    redirectTo?: string;
  }>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return <LoginForm redirectTo={params.redirectTo} />;
}
