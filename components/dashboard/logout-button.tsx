"use client";

import { useFormStatus } from "react-dom";

type LogoutButtonProps = Readonly<{
  action: () => void;
}>;

function LogoutSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground transition hover:bg-muted disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Signing out" : "Sign out"}
    </button>
  );
}

export function LogoutButton({ action }: LogoutButtonProps) {
  return (
    <form action={action}>
      <LogoutSubmit />
    </form>
  );
}
