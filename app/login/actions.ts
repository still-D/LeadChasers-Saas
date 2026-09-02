"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { getMemberProfile } from "@/lib/permissions";
import { isCompanyEmail, normalizeEmail } from "@/lib/security";
import { type LoginActionState } from "./action-state";

const loginSchema = z.object({
  email: z.string().trim().min(1, "L'adresse email est requise.").email("L'adresse email n'est pas valide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

export async function login(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  if (!hasSupabaseConfig()) return { status: "error", message: "La base de données n'est pas configurée." };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: LoginActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof typeof fieldErrors;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Vérifiez vos informations.", fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Connexion à la base de données indisponible." };

  const email = normalizeEmail(parsed.data.email);
  if (!isCompanyEmail(email)) return { status: "error", message: "Identifiants incorrects ou accès non autorisé." };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.user) return { status: "error", message: "Identifiants incorrects ou accès non autorisé." };

  const profile = await getMemberProfile(data.user.id);
  if (!profile || !["active", "invited"].includes(profile.status) || !profile.role.active || !profile.department.active) {
    await supabase.auth.signOut();
    return { status: "error", message: "Identifiants incorrects ou accès non autorisé." };
  }

  if (profile.status === "invited" || data.user.user_metadata?.must_change_password === true) {
    redirect("/update-password");
  }

  redirect("/dashboard");
}
