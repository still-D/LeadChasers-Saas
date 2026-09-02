"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isStrongPassword } from "@/lib/security";

export type PasswordState = { status: "idle" | "error"; message?: string };
export const initialPasswordState: PasswordState = { status: "idle" };

const schema = z.object({
  password: z.string().min(12).max(128),
  confirmation: z.string().min(1),
}).refine((input) => input.password === input.confirmation, { message: "Les mots de passe ne correspondent pas." });

export async function updatePassword(_: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = schema.safeParse({ password: formData.get("password"), confirmation: formData.get("confirmation") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Mot de passe invalide." };
  if (!isStrongPassword(parsed.data.password)) {
    return { status: "error", message: "Utilisez 12 caractères minimum avec majuscule, minuscule, chiffre et symbole." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Service d’authentification indisponible." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Ce lien n’est plus valide. Demandez-en un nouveau." };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { ...user.user_metadata, must_change_password: false },
  });
  if (error) return { status: "error", message: "Impossible d’enregistrer le mot de passe. Demandez un nouveau lien." };

  const service = createSupabaseServiceClient();
  if (service) await service.from("members").update({ status: "active" }).eq("user_id", user.id).eq("status", "invited");
  redirect("/dashboard");
}
