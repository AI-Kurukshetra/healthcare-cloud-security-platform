import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset password for an invited account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
