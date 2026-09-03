import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function firstConfiguredValue(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? null;
}

export function getSupabaseUrl() {
  return firstConfiguredValue(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function getSupabasePublishableKey() {
  return firstConfiguredValue(
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function hasSupabaseServiceConfig() {
  return Boolean(
    getSupabaseUrl() &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

export function createSupabaseServiceClient() {
  if (!hasSupabaseServiceConfig()) return null;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(
    getSupabaseUrl()!,
    secretKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function createSupabaseServerClient() {
  if (!hasSupabaseConfig()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    getSupabaseUrl()!,
    getSupabasePublishableKey()!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: options.path ?? "/",
            }));
          }
          catch { /* Server Components cannot write cookies; Server Actions can. */ }
        },
      },
    },
  );
}
