"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEmployeeSession } from "@/lib/auth";
import {
  createDepartment,
  createRole,
  getMemberById,
  hasPermission,
  listMembers,
  listRoles,
  logAudit,
  setUserPermissionOverride,
  updateDepartment,
  updateMemberProfile,
  updateMemberStatus,
  updateRole,
  upsertRolePermission,
  type AuditAction,
  type MemberStatus,
} from "@/lib/permissions";
import { createMember, type CreateMemberInput } from "@/lib/members";
import {
  createMemberSchema,
  departmentSchema,
  roleSchema,
  type DepartmentActionState,
  type MemberActionState,
  type RoleActionState,
} from "./action-state";

const uuidSchema = z.string().uuid();
const memberStatusSchema = z.enum(["invited", "active", "suspended", "deactivated"]);

async function getCurrentAdminContext(requiredPermission: string) {
  const session = await getEmployeeSession();
  if (!session) return { ok: false, message: "Session employé invalide." } as const;
  const allowed = await hasPermission(session.userId, requiredPermission);
  if (!allowed) return { ok: false, message: "Vous n'avez pas l'autorisation requise." } as const;
  return { ok: true, userId: session.userId, cooperativeId: session.profile.cooperative_id, profile: session.profile } as const;
}

export async function createMemberAction(_: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const ctx = await getCurrentAdminContext("members.create");
  if (!ctx.ok) return { status: "error", message: ctx.message };
  if (!ctx.profile.is_founder) return { status: "error", message: "Seul le compte fondateur peut créer des comptes employés." };

  const parsed = createMemberSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    occupation: formData.get("occupation") || undefined,
    cooperativePosition: formData.get("cooperativePosition") || undefined,
    departmentId: formData.get("departmentId"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    const fieldErrors: MemberActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof typeof fieldErrors;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Vérifiez les informations du membre.", fieldErrors };
  }

  const selectedRole = (await listRoles()).find((role) => role.id === parsed.data.roleId && role.active);
  if (!selectedRole || selectedRole.slug === "ceo") {
    return { status: "error", message: "Le rôle CEO est réservé au compte fondateur." };
  }

  const input: CreateMemberInput = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    occupation: parsed.data.occupation,
    cooperativePosition: parsed.data.cooperativePosition,
    departmentId: parsed.data.departmentId,
    roleId: parsed.data.roleId,
  };

  const result = await createMember(ctx.userId, ctx.cooperativeId, input);
  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/admin/members");
  return { status: "success", message: result.inviteSent ? "Membre créé et invitation envoyée." : "Membre créé. L'email d'invitation n'a pas pu être envoyé." };
}

const updateMemberSchema = z.object({
  memberId: z.string().uuid(),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).optional(),
  occupation: z.string().trim().max(120).optional(),
  cooperativePosition: z.string().trim().max(120).optional(),
  departmentId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export async function updateMemberAction(_: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const ctx = await getCurrentAdminContext("members.edit");
  if (!ctx.ok) return { status: "error", message: ctx.message };

  const parsed = updateMemberSchema.safeParse({
    memberId: formData.get("memberId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    occupation: formData.get("occupation") || undefined,
    cooperativePosition: formData.get("cooperativePosition") || undefined,
    departmentId: formData.get("departmentId"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const member = await getMemberById(parsed.data.memberId);
  if (!member || member.cooperative_id !== ctx.cooperativeId) return { status: "error", message: "Membre introuvable." };
  const selectedRole = (await listRoles()).find((role) => role.id === parsed.data.roleId && role.active);
  if (!selectedRole || (selectedRole.slug === "ceo" && !member.is_founder)) {
    return { status: "error", message: "Le rôle CEO est réservé au compte fondateur." };
  }

  await updateMemberProfile(parsed.data.memberId, {
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    phone: parsed.data.phone,
    occupation: parsed.data.occupation,
    cooperative_position: parsed.data.cooperativePosition,
    department_id: parsed.data.departmentId,
    role_id: member.is_founder ? member.role_id : parsed.data.roleId,
  });

  await logAudit(ctx.userId, "member.updated", "member", parsed.data.memberId, {
    role_id: parsed.data.roleId,
    department_id: parsed.data.departmentId,
  });

  revalidatePath(`/admin/members/${parsed.data.memberId}`);
  revalidatePath("/admin/members");
  return { status: "success", message: "Membre mis à jour." };
}

export async function updateMemberStatusAction(memberId: string, status: MemberStatus): Promise<{ ok: boolean; message: string }> {
  const ctx = await getCurrentAdminContext("members.suspend");
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const parsedId = uuidSchema.safeParse(memberId);
  const parsedStatus = memberStatusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return { ok: false, message: "Requête invalide." };
  const member = await getMemberById(parsedId.data);
  if (!member || member.cooperative_id !== ctx.cooperativeId) return { ok: false, message: "Membre introuvable." };
  if (member.is_founder) return { ok: false, message: "Le compte fondateur est protégé et doit rester actif." };

  await updateMemberStatus(parsedId.data, parsedStatus.data);

  const actionMap: Record<MemberStatus, AuditAction> = {
    active: "member.reactivated",
    suspended: "member.suspended",
    deactivated: "member.deactivated",
    invited: "account.activated",
  };
  await logAudit(ctx.userId, actionMap[parsedStatus.data], "member", parsedId.data, { status: parsedStatus.data });

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  return { ok: true, message: "Statut mis à jour." };
}

export async function updateRolePermissionAction(roleId: string, permissionId: string, granted: boolean): Promise<{ ok: boolean; message: string }> {
  const ctx = await getCurrentAdminContext("permissions.manage");
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const parsed = z.object({ roleId: uuidSchema, permissionId: uuidSchema, granted: z.boolean() }).safeParse({ roleId, permissionId, granted });
  if (!parsed.success) return { ok: false, message: "Requête invalide." };
  await upsertRolePermission(parsed.data.roleId, parsed.data.permissionId, parsed.data.granted);
  await logAudit(ctx.userId, granted ? "permission.granted" : "permission.revoked", "role_permission", `${roleId}:${permissionId}`);

  revalidatePath(`/admin/roles/${roleId}`);
  return { ok: true, message: "Permission mise à jour." };
}

export async function updateUserOverrideAction(memberId: string, permissionId: string, effect: "allow" | "deny" | "none"): Promise<{ ok: boolean; message: string }> {
  const ctx = await getCurrentAdminContext("permissions.manage");
  if (!ctx.ok) return { ok: false, message: ctx.message };

  const parsed = z.object({ memberId: uuidSchema, permissionId: uuidSchema, effect: z.enum(["allow", "deny", "none"]) }).safeParse({ memberId, permissionId, effect });
  if (!parsed.success) return { ok: false, message: "Requête invalide." };
  const members = await listMembers(ctx.cooperativeId);
  const member = members.find((m) => m.id === parsed.data.memberId && m.cooperative_id === ctx.cooperativeId);
  if (!member) return { ok: false, message: "Membre introuvable." };
  if (member.is_founder) return { ok: false, message: "Les permissions du fondateur ne peuvent pas être restreintes." };

  const resolvedEffect: "allow" | "deny" | null = parsed.data.effect === "none" ? null : parsed.data.effect;
  await setUserPermissionOverride(member.user_id, parsed.data.permissionId, resolvedEffect);
  if (resolvedEffect) {
    await logAudit(ctx.userId, resolvedEffect === "allow" ? "permission.granted" : "permission.denied", "user_permission_override", `${member.user_id}:${permissionId}`);
  } else {
    await logAudit(ctx.userId, "permission.revoked", "user_permission_override", `${member.user_id}:${permissionId}`);
  }

  revalidatePath(`/admin/members/${memberId}`);
  return { ok: true, message: "Override mis à jour." };
}

export async function createDepartmentAction(_: DepartmentActionState, formData: FormData): Promise<DepartmentActionState> {
  const ctx = await getCurrentAdminContext("system.settings");
  if (!ctx.ok) return { status: "error", message: ctx.message };

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    active: formData.get("active") || "true",
  });
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const dept = await createDepartment(parsed.data.name, parsed.data.description);
  await logAudit(ctx.userId, "department.created", "department", dept.id, { name: dept.name });
  revalidatePath("/admin/departments");
  return { status: "success", message: "Département créé." };
}

export async function updateDepartmentAction(departmentId: string, formData: FormData): Promise<DepartmentActionState> {
  const ctx = await getCurrentAdminContext("system.settings");
  if (!ctx.ok) return { status: "error", message: ctx.message };

  const parsedId = uuidSchema.safeParse(departmentId);
  if (!parsedId.success) return { status: "error", message: "Département invalide." };
  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    active: formData.get("active") || "true",
  });
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  await updateDepartment(parsedId.data, {
    name: parsed.data.name,
    description: parsed.data.description,
    active: parsed.data.active === "true",
  });
  await logAudit(ctx.userId, "department.updated", "department", departmentId, { name: parsed.data.name });
  revalidatePath("/admin/departments");
  return { status: "success", message: "Département mis à jour." };
}

export async function createRoleAction(_: RoleActionState, formData: FormData): Promise<RoleActionState> {
  const ctx = await getCurrentAdminContext("roles.create");
  if (!ctx.ok) return { status: "error", message: ctx.message };

  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  const role = await createRole(parsed.data.name, parsed.data.slug, parsed.data.description);
  await logAudit(ctx.userId, "role.created", "role", role.id, { name: role.name });
  revalidatePath("/admin/roles");
  return { status: "success", message: "Rôle créé." };
}

export async function updateRoleAction(_: RoleActionState, formData: FormData): Promise<RoleActionState> {
  const ctx = await getCurrentAdminContext("roles.edit");
  if (!ctx.ok) return { status: "error", message: ctx.message };

  const roleId = uuidSchema.safeParse(formData.get("roleId"));
  if (!roleId.success) return { status: "error", message: "Rôle invalide." };

  const parsed = roleSchema.omit({ slug: true }).safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Données invalides." };

  await updateRole(roleId.data, { name: parsed.data.name, description: parsed.data.description });
  await logAudit(ctx.userId, "role.updated", "role", roleId.data, { name: parsed.data.name });
  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${roleId.data}`);
  return { status: "success", message: "Rôle mis à jour." };
}
