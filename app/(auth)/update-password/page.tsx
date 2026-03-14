import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Update Password",
  description: "Update account password from a recovery link.",
};

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />;
}
