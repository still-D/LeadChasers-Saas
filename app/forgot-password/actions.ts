"use server";

import { z } from "zod";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { isCompanyEmail, normalizeEmail } from "@/lib/security";

export type ForgotPasswordState = { status: "idle" | "success" | "error"; message?: string };
export const initialForgotPasswordState: ForgotPasswordState = { status: "idle" };

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function requestPasswordReset(_: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  const generic = "Si ce compte professionnel existe, un lien sécurisé vient d’être envoyé.";
  if (!parsed.success || !isCompanyEmail(parsed.data.email)) return { status: "success", message: generic };
  if (!hasSupabaseConfig()) return { status: "error", message: "Le service d’authentification n’est pas configuré." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Service momentanément indisponible." };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(normalizeEmail(parsed.data.email), {
    redirectTo: `${appUrl}/auth/callback?next=/update-password`,
  });
  return { status: "success", message: generic };
}
