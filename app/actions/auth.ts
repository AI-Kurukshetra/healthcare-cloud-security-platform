"use server";

import { redirect } from "next/navigation";

import { getCurrentUserContext } from "@/lib/auth/context";
import { logAuditEvent } from "@/lib/auth/audit";
import type { FormState } from "@/lib/forms/form-state";
import { getRequestOrigin } from "@/lib/auth/url";
import { createServerClient } from "@/lib/supabase/server";
import { loginSchema, resetPasswordSchema, updatePasswordSchema } from "@/lib/validations/auth";

function sanitizeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const redirectTo = value.trim();
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return null;
  }

  return redirectTo;
}

export async function signInWithPassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter valid credentials.",
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  const redirectTo = sanitizeRedirectPath(formData.get("redirectTo"));

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  const context = await getCurrentUserContext();

  await logAuditEvent({
    organizationId: context?.organization?.id ?? null,
    actorUserId: context?.user.id ?? null,
    action: "auth.sign_in",
    entityType: "session",
    metadata: {
      aal: context?.aal ?? "aal1",
    },
  });

  if (context?.needsMfa) {
    redirect("/mfa-setup");
  }

  if (!context?.membership) {
    if (redirectTo?.startsWith("/accept-invite")) {
      redirect(redirectTo as Parameters<typeof redirect>[0]);
    }

    redirect("/access-pending");
  }

  if (redirectTo) {
    redirect(redirectTo as Parameters<typeof redirect>[0]);
  }

  redirect("/dashboard");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const origin = await getRequestOrigin();
  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/update-password`,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  return {
    status: "success",
    message: "Password reset instructions have been sent if the account exists.",
  };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid password.",
    };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "Recovery session is invalid or expired. Request a new reset link.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  await logAuditEvent({
    organizationId: null,
    actorUserId: user.id,
    action: "auth.password_updated",
    entityType: "profile",
    entityId: user.id,
    metadata: {
      source: "password_recovery",
    },
  });

  return {
    status: "success",
    message: "Password updated successfully. You can now sign in with your new password.",
  };
}

export async function signOut() {
  const context = await getCurrentUserContext();
  const supabase = await createServerClient();

  await logAuditEvent({
    organizationId: context?.organization?.id ?? null,
    actorUserId: context?.user.id ?? null,
    action: "auth.sign_out",
    entityType: "session",
  });

  await supabase.auth.signOut();
  redirect("/login");
}
