import { createSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { cache } from "react";

export type Permission = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  resource: string;
  action: string;
};

export type Role = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  is_system_role: boolean;
};

export type Department = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type MemberStatus = "invited" | "active" | "suspended" | "deactivated";

export type MemberProfile = {
  id: string;
  user_id: string;
  cooperative_id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  occupation: string;
  cooperative_position: string;
  department_id: string;
  role_id: string;
  status: MemberStatus;
  is_founder: boolean;
  created_at: string;
  updated_at: string;
  role: Role;
  department: Department;
};

export type PermissionEffect = "allow" | "deny";

export type UserPermissionOverride = {
  id: string;
  user_id: string;
  permission_id: string;
  effect: PermissionEffect;
  permission: Permission;
};

export type PermissionCheckResult =
  | { ok: true; source: "override_allow" | "role" | "super_admin" }
  | { ok: false; source: "override_deny" | "no_role" | "no_permission" };

type PermissionResolution = {
  roleSlug: string | null;
  rolePermissions: Set<string>;
  overrides: Map<string, PermissionEffect>;
  isFounder: boolean;
};

/**
 * PostgREST returns a to-one relationship as an object. Some generated client
 * types and older responses represent the same relationship as a one-item
 * array, so normalize both shapes at the data boundary.
 */
export function normalizeSupabaseRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function resolvePermissions(userId: string): Promise<PermissionResolution> {
  if (!hasSupabaseConfig()) return { roleSlug: null, rolePermissions: new Set(), overrides: new Map(), isFounder: false };
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { roleSlug: null, rolePermissions: new Set(), overrides: new Map(), isFounder: false };

  const { data: member } = await supabase
    .from("members")
    .select("role_id, status, is_founder, roles:role_id (slug, active), departments:department_id (active)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const department = normalizeSupabaseRelation(member?.departments);
  if (!member || member.status !== "active" || !department?.active) {
    return { roleSlug: null, rolePermissions: new Set(), overrides: new Map(), isFounder: false };
  }

  const role = normalizeSupabaseRelation(member.roles);
  const roleSlug = role?.active ? role.slug : null;
  const roleId = roleSlug ? member.role_id : null;

  const rolePermissions = new Set<string>();
  if (roleId) {
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("permissions:permission_id (slug)")
      .eq("role_id", roleId);
    for (const row of perms ?? []) {
      const perm = normalizeSupabaseRelation(row.permissions);
      if (perm?.slug) rolePermissions.add(perm.slug);
    }
  }

  const { data: overrides } = await supabase
    .from("user_permission_overrides")
    .select("permission_id, effect, permissions:permission_id (slug)")
    .eq("user_id", userId);

  const overrideMap = new Map<string, PermissionEffect>();
  for (const row of overrides ?? []) {
    const perm = normalizeSupabaseRelation(row.permissions);
    if (perm?.slug) overrideMap.set(perm.slug, row.effect as PermissionEffect);
  }

  return { roleSlug, rolePermissions, overrides: overrideMap, isFounder: Boolean(member.is_founder) };
}

// React cache is scoped to the current server render/action request. It avoids
// repeated RBAC queries without leaking stale permissions across requests.
const getRequestPermissionResolution = cache(resolvePermissions);

/**
 * Pure permission resolution.
 *
 * Resolution order:
 * 1. Protected founder -> allow.
 * 2. Explicit DENY override -> deny.
 * 3. Explicit ALLOW override -> allow.
 * 4. CEO / super administrator role -> allow.
 * 5. Role permission -> allow.
 * 6. Otherwise deny.
 */
export function resolveEffectivePermission(
  roleSlug: string | null,
  rolePermissions: Set<string>,
  overrides: Map<string, PermissionEffect>,
  permissionSlug: string,
  isFounder = false,
): boolean {
  if (isFounder) return true;
  const override = overrides.get(permissionSlug);
  if (override === "deny") return false;
  if (override === "allow") return true;

  if (roleSlug === "ceo") return true;

  return rolePermissions.has(permissionSlug);
}

/**
 * Check whether a user has a given permission.
 */
export async function hasPermission(userId: string, permissionSlug: string): Promise<boolean> {
  const resolution = await getRequestPermissionResolution(userId);
  return resolveEffectivePermission(resolution.roleSlug, resolution.rolePermissions, resolution.overrides, permissionSlug, resolution.isFounder);
}

export async function checkPermission(userId: string, permissionSlug: string): Promise<PermissionCheckResult> {
  const resolution = await getRequestPermissionResolution(userId);

  if (resolution.isFounder) return { ok: true, source: "super_admin" };

  const override = resolution.overrides.get(permissionSlug);
  if (override === "deny") return { ok: false, source: "override_deny" };
  if (override === "allow") return { ok: true, source: "override_allow" };

  if (resolution.roleSlug === "ceo") return { ok: true, source: "super_admin" };
  if (resolution.rolePermissions.has(permissionSlug)) return { ok: true, source: "role" };

  return { ok: false, source: resolution.roleSlug ? "no_permission" : "no_role" };
}

export async function requirePermission(userId: string, permissionSlug: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const allowed = await hasPermission(userId, permissionSlug);
  if (!allowed) return { ok: false, message: "Vous n'avez pas l'autorisation requise pour cette action." };
  return { ok: true };
}

export async function getMemberProfile(userId: string): Promise<MemberProfile | null> {
  if (!hasSupabaseConfig()) return null;
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("members")
    .select("id, user_id, cooperative_id, member_id, first_name, last_name, email, phone, occupation, cooperative_position, department_id, role_id, status, is_founder, created_at, updated_at, roles:role_id (id, name, slug, description, active, is_system_role), departments:department_id (id, name, description, active)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!data) return null;
  const roleRow = normalizeSupabaseRelation(data.roles);
  const deptRow = normalizeSupabaseRelation(data.departments);
  if (!roleRow || !deptRow) return null;

  return {
    ...data,
    role: roleRow as Role,
    department: deptRow as Department,
    email: data.email ?? null,
    phone: data.phone ?? null,
    status: data.status as MemberStatus,
  } as MemberProfile;
}

export async function getMemberById(id: string): Promise<MemberProfile | null> {
  if (!hasSupabaseConfig()) return null;
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("members")
    .select("id, user_id, cooperative_id, member_id, first_name, last_name, email, phone, occupation, cooperative_position, department_id, role_id, status, is_founder, created_at, updated_at, roles:role_id (id, name, slug, description, active, is_system_role), departments:department_id (id, name, description, active)")
    .eq("id", id)
    .limit(1)
    .single();

  if (!data) return null;
  const roleRow = normalizeSupabaseRelation(data.roles);
  const deptRow = normalizeSupabaseRelation(data.departments);
  if (!roleRow || !deptRow) return null;

  return {
    ...data,
    role: roleRow as Role,
    department: deptRow as Department,
    email: data.email ?? null,
    phone: data.phone ?? null,
    status: data.status as MemberStatus,
  } as MemberProfile;
}

export async function listMembers(cooperativeId: string): Promise<MemberProfile[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("members")
    .select("id, user_id, cooperative_id, member_id, first_name, last_name, email, phone, occupation, cooperative_position, department_id, role_id, status, is_founder, created_at, updated_at, roles:role_id (id, name, slug, description, active, is_system_role), departments:department_id (id, name, description, active)")
    .eq("cooperative_id", cooperativeId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const roleRow = normalizeSupabaseRelation(row.roles);
    const deptRow = normalizeSupabaseRelation(row.departments);
    return {
      ...row,
      role: roleRow as Role,
      department: deptRow as Department,
      email: row.email ?? null,
      phone: row.phone ?? null,
      status: row.status as MemberStatus,
    } as MemberProfile;
  });
}

export async function listPermissions(): Promise<Permission[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from("permissions").select("id, name, slug, description, resource, action").order("resource", { ascending: true }).order("action", { ascending: true });
  return (data ?? []) as Permission[];
}

export async function listRoles(): Promise<Role[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from("roles").select("id, name, slug, description, active, is_system_role").order("name", { ascending: true });
  return (data ?? []) as Role[];
}

export async function listDepartments(): Promise<Department[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from("departments").select("id, name, description, active").order("name", { ascending: true });
  return (data ?? []) as Department[];
}

export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("role_permissions")
    .select("permissions:permission_id (id, name, slug, description, resource, action)")
    .eq("role_id", roleId);

  const perms: Permission[] = [];
  for (const row of data ?? []) {
    const perm = normalizeSupabaseRelation(row.permissions);
    if (perm) perms.push(perm);
  }
  return perms.sort((a, b) => a.resource.localeCompare(b.resource) || a.action.localeCompare(b.action));
}

export async function getUserOverrides(userId: string): Promise<UserPermissionOverride[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("user_permission_overrides")
    .select("id, user_id, permission_id, effect, permissions:permission_id (id, name, slug, description, resource, action)")
    .eq("user_id", userId);

  return (data ?? []).map((row) => {
    const perm = normalizeSupabaseRelation(row.permissions);
    return { ...row, permission: perm as Permission } as UserPermissionOverride;
  });
}

// Admin helpers (service-role writes). These assume the caller has already been authorized.

export async function upsertRolePermission(roleId: string, permissionId: string, granted: boolean): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Service client unavailable");
  if (granted) {
    const { error } = await supabase.from("role_permissions").upsert({ role_id: roleId, permission_id: permissionId }, { onConflict: "role_id,permission_id" });
    if (error) throw new Error("Failed to grant role permission");
  } else {
    const { error } = await supabase.from("role_permissions").delete().eq("role_id", roleId).eq("permission_id", permissionId);
    if (error) throw new Error("Failed to revoke role permission");
  }
}

export async function setUserPermissionOverride(userId: string, permissionId: string, effect: PermissionEffect | null): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Service client unavailable");
  if (effect === null) {
    const { error } = await supabase.from("user_permission_overrides").delete().eq("user_id", userId).eq("permission_id", permissionId);
    if (error) throw new Error("Failed to clear permission override");
  } else {
    const { error } = await supabase.from("user_permission_overrides").upsert({ user_id: userId, permission_id: permissionId, effect }, { onConflict: "user_id,permission_id" });
    if (error) throw new Error("Failed to update permission override");
  }
}

export async function updateMemberRole(memberId: string, roleId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Service client unavailable");
  const { error } = await supabase.from("members").update({ role_id: roleId, updated_at: new Date().toISOString() }).eq("id", memberId);
  if (error) throw new Error("Failed to update member role");
}

export async function updateMemberStatus(memberId: string, status: MemberStatus): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Service client unavailable");
  const { error } = await supabase.from("members").update({ status, updated_at: new Date().toISOString() }).eq("id", memberId);
  if (error) throw new Error("Failed to update member status");
}

export async function updateMemberProfile(
  memberId: string,
  input: Partial<Pick<MemberProfile, "first_name" | "last_name" | "phone" | "occupation" | "cooperative_position" | "department_id" | "role_id">>,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Service client unavailable");
  const { error } = await supabase.from("members").update({ ...input, updated_at: new Date().toISOString() }).eq("id", memberId);
  if (error) throw new Error("Failed to update member profile");
}

export async function createDepartment(name: string, description?: string): Promise<Department> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Service client unavailable");
  const { data, error } = await supabase.from("departments").insert({ name, description: description || null }).select("id, name, description, active").single();
  if (error || !data) throw new Error("Failed to create department");
  return data as Department;
}

export async function updateDepartment(id: string, input: Partial<Pick<Department, "name" | "description" | "active">>): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Service client unavailable");
  const { error } = await supabase.from("departments").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Failed to update department");
}

export async function createRole(name: string, slug: string, description?: string): Promise<Role> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Service client unavailable");
  const { data, error } = await supabase.from("roles").insert({ name, slug, description: description || null }).select("id, name, slug, description, active, is_system_role").single();
  if (error || !data) throw new Error("Failed to create role");
  return data as Role;
}

export async function updateRole(id: string, input: Partial<Pick<Role, "name" | "description" | "active">>): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Service client unavailable");
  const { error } = await supabase.from("roles").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Failed to update role");
}

// Audit logging.

export type AuditAction =
  | "member.created"
  | "member.updated"
  | "member.suspended"
  | "member.reactivated"
  | "member.deactivated"
  | "role.created"
  | "role.updated"
  | "role.assigned"
  | "permission.granted"
  | "permission.revoked"
  | "permission.denied"
  | "account.invited"
  | "account.activated"
  | "account.suspended"
  | "department.created"
  | "department.updated"
  | "project.created"
  | "project.updated"
  | "production.phase_updated"
  | "client.created"
  | "quote.created"
  | "account.password_changed";

export async function logAudit(
  actorUserId: string | null,
  action: AuditAction,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;
  let cooperativeId: string | null = null;
  if (actorUserId) {
    const { data: actor } = await supabase
      .from("members")
      .select("cooperative_id")
      .eq("user_id", actorUserId)
      .limit(1)
      .maybeSingle();
    cooperativeId = actor?.cooperative_id ?? null;
  }
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: actorUserId,
    cooperative_id: cooperativeId,
    action,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
    metadata: metadata ?? {},
  });
  if (error) console.error("Audit log write failed", { action, resourceType, code: error.code });
}

export async function listAuditLogs(cooperativeId: string, limit = 100): Promise<{ id: string; actor_user_id: string | null; action: string; resource_type: string; resource_id: string | null; metadata: Record<string, unknown>; created_at: string }[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, resource_type, resource_id, metadata, created_at")
    .eq("cooperative_id", cooperativeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({ ...row, metadata: (row.metadata ?? {}) as Record<string, unknown> }));
}
