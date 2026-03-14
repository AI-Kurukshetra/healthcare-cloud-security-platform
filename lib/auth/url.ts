import { headers } from "next/headers";

export async function getRequestOrigin() {
  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "127.0.0.1:3000";

  return `${proto}://${host}`;
}
