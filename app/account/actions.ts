"use server";

import { z } from "zod";
import { getEmployeeSession } from "@/lib/auth";
import { logAudit } from "@/lib/permissions";
import { clearLoginAccountRateLimit, consumeLoginRateLimit } from "@/lib/rate-limit";
import { isStrongPassword } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PasswordChangeActionState } from "./password-action-state";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel.").max(128),
  password: z.string().min(12, "Le nouveau mot de passe doit contenir au moins 12 caractères.").max(128),
  confirmation: z.string().min(1, "Confirmez votre nouveau mot de passe.").max(128),
}).superRefine((input, context) => {
  if (input.password !== input.confirmation) {
    context.addIssue({ code: "custom", path: ["confirmation"], message: "Les mots de passe ne correspondent pas." });
  }
  if (input.currentPassword === input.password) {
    context.addIssue({ code: "custom", path: ["password"], message: "Le nouveau mot de passe doit être différent de l’ancien." });
  }
});

export async function changeAccountPassword(
  _: PasswordChangeActionState,
  formData: FormData,
): Promise<PasswordChangeActionState> {
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    const fieldErrors: PasswordChangeActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<PasswordChangeActionState["fieldErrors"]>;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Vérifiez les informations saisies.", fieldErrors };
  }

  if (!isStrongPassword(parsed.data.password)) {
    return {
      status: "error",
      message: "Le nouveau mot de passe ne respecte pas la politique de sécurité.",
      fieldErrors: {
        password: "Utilisez une majuscule, une minuscule, un chiffre et un symbole.",
      },
    };
  }

  const session = await getEmployeeSession();
  if (!session) return { status: "error", message: "Votre session a expiré. Reconnectez-vous avant de réessayer." };

  const rateLimit = await consumeLoginRateLimit(session.email);
  if (!rateLimit.allowed) {
    return { status: "error", message: "Trop de tentatives. Patientez avant de réessayer." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Service d’authentification indisponible." };

  const { data: authentication, error: authenticationError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: parsed.data.currentPassword,
  });

  if (authenticationError || authentication.user?.id !== session.userId) {
    return {
      status: "error",
      message: "Le mot de passe actuel est incorrect.",
      fieldErrors: { currentPassword: "Mot de passe actuel incorrect." },
    };
  }

  await clearLoginAccountRateLimit(session.email);

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
    current_password: parsed.data.currentPassword,
  });

  if (updateError) {
    console.error("Authenticated password change rejected", { code: updateError.code });
    return {
      status: "error",
      message: "Le nouveau mot de passe a été refusé. Vérifiez qu’il est unique et suffisamment fort.",
    };
  }

  const { error: revokeError } = await supabase.auth.signOut({ scope: "others" });
  if (revokeError) console.error("Failed to revoke other sessions after account password change", { code: revokeError.code });

  await logAudit(session.userId, "account.password_changed", "member", session.profile.id);
  return { status: "success", message: "Votre mot de passe a été modifié. Les autres sessions ont été déconnectées." };
}
