import { randomBytes } from "crypto";
import { Resend } from "resend";
import { createSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { logAudit, updateMemberStatus, type MemberStatus } from "@/lib/permissions";
import { isCompanyEmail, normalizeEmail } from "@/lib/security";

export type CreateMemberInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  occupation?: string;
  cooperativePosition?: string;
  departmentId: string;
  roleId: string;
};

export type CreateMemberResult =
  | { ok: true; memberId: string; userId: string; inviteSent: boolean }
  | { ok: false; reason: "unconfigured" | "unauthorized" | "duplicate" | "email_failed" | "unknown"; message: string };

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? "noreply@leadchasers.ma";
}

function generateTemporaryPassword(): string {
  return `Lc!${randomBytes(24).toString("base64url")}9aA`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

export async function createMember(
  actorUserId: string,
  cooperativeId: string,
  input: CreateMemberInput,
): Promise<CreateMemberResult> {
  if (!hasSupabaseConfig()) return { ok: false, reason: "unconfigured", message: "Base de données non configurée." };

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, reason: "unconfigured", message: "Client de service indisponible." };

  const email = normalizeEmail(input.email);
  if (!isCompanyEmail(email)) {
    return { ok: false, reason: "unauthorized", message: "Seules les adresses @leadchasers.ma peuvent recevoir un accès." };
  }

  // Prevent duplicate member email within the cooperative.
  const { data: existingMember } = await supabase
    .from("members")
    .select("id")
    .eq("cooperative_id", cooperativeId)
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (existingMember) return { ok: false, reason: "duplicate", message: "Un membre avec cet email existe déjà dans la coopérative." };

  // Create the Supabase auth user with a random password the user does not know.
  const tempPassword = generateTemporaryPassword();
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: `${input.firstName.trim()} ${input.lastName.trim()}`, must_change_password: true },
  });

  if (authError || !authUser.user) {
    console.error("Failed to create auth user", authError);
    return { ok: false, reason: "unknown", message: "Impossible de créer le compte utilisateur." };
  }

  const userId = authUser.user.id;

  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      cooperative_id: cooperativeId,
      user_id: userId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email,
      phone: input.phone?.trim() || null,
      occupation: input.occupation?.trim() || "Non spécifié",
      cooperative_position: input.cooperativePosition?.trim() || "Contributor",
      department_id: input.departmentId,
      role_id: input.roleId,
      status: "invited" as MemberStatus,
    })
    .select("id")
    .single();

  if (memberError || !member) {
    console.error("Failed to create member profile", memberError);
    // Best-effort cleanup of the auth user.
    await supabase.auth.admin.deleteUser(userId);
    return { ok: false, reason: "unknown", message: "Impossible de créer le profil membre." };
  }

  // Generate a password reset link so the new member can set their own password.
  let inviteSent = false;
  const resend = getResend();
  if (resend) {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/auth/callback?next=/update-password`,
      },
    });
    if (!linkError && linkData.properties.action_link) {
      const { error: sendError } = await resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: "Votre accès LeadChasers OS",
        html: `<p>Bonjour ${escapeHtml(input.firstName.trim())},</p>
          <p>Un compte vous a été créé sur LeadChasers OS. Définissez votre mot de passe en cliquant sur le lien ci-dessous :</p>
          <p><a href="${escapeHtml(linkData.properties.action_link)}">Définir mon mot de passe</a></p>
          <p>Ce lien expire sous 24 heures.</p>`,
      });
      if (!sendError) inviteSent = true;
      else console.error("Failed to send invite email", sendError);
    } else {
      console.error("Failed to generate recovery link", linkError);
    }
  }

  await logAudit(actorUserId, "member.created", "member", member.id, {
    email,
    role_id: input.roleId,
    department_id: input.departmentId,
    invite_sent: inviteSent,
  });

  return { ok: true, memberId: member.id, userId, inviteSent };
}

export async function deactivateMember(actorUserId: string, memberId: string): Promise<void> {
  await updateMemberStatus(memberId, "deactivated");
  await logAudit(actorUserId, "member.deactivated", "member", memberId);
}

export async function suspendMember(actorUserId: string, memberId: string): Promise<void> {
  await updateMemberStatus(memberId, "suspended");
  await logAudit(actorUserId, "member.suspended", "member", memberId);
}

export async function reactivateMember(actorUserId: string, memberId: string): Promise<void> {
  await updateMemberStatus(memberId, "active");
  await logAudit(actorUserId, "member.reactivated", "member", memberId);
}
