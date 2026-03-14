import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSupabaseServerClient, type CookieOptions } from "@supabase/ssr";

import { getSupabasePublicEnv, getSupabaseServiceEnv } from "@/lib/supabase/env";

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function createServerClient() {
  const env = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createSupabaseServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export function createAdminClient() {
  const env = getSupabaseServiceEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
