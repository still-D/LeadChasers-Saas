"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PASSWORD_RECOVERY_COOKIE, passwordRecoveryCookieOptions } from "@/lib/password-recovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  (await cookies()).set(PASSWORD_RECOVERY_COOKIE, "", { ...passwordRecoveryCookieOptions, maxAge: 0 });
  redirect("/login");
}
