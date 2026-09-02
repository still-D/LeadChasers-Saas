import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabaseConfig, createSupabaseServerClient } from "@/lib/supabase/server";
import { getRolePermissions, hasPermission, listPermissions, listRoles } from "@/lib/permissions";
import { PermissionToggle } from "./permission-toggle";
import { UpdateRoleForm } from "./update-role-form";

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await hasPermission(user.id, "roles.view");
  if (!allowed) redirect("/dashboard");

  const { id } = await params;
  const [roles, allPermissions, rolePermissions] = await Promise.all([listRoles(), listPermissions(), getRolePermissions(id)]);
  const role = roles.find((r) => r.id === id);
  if (!role) redirect("/admin/roles");

  const canManage = await hasPermission(user.id, "permissions.manage");
  const canEdit = await hasPermission(user.id, "roles.edit");
  const rolePermIds = new Set(rolePermissions.map((p) => p.id));

  const byResource = allPermissions.reduce<Record<string, typeof allPermissions>>((acc, perm) => {
    acc[perm.resource] = acc[perm.resource] ?? [];
    acc[perm.resource].push(perm);
    return acc;
  }, {});

  return (
    <section>
      <header className="admin-section-header">
        <h1>{role.name}</h1>
        <Link className="button button-small" href="/admin/roles">← Retour</Link>
      </header>

      {canEdit && (
        <article className="admin-card">
          <h2>Modifier le rôle</h2>
          <UpdateRoleForm role={role} />
        </article>
      )}

      <article className="admin-card">
        <h2>Permissions du rôle</h2>
        {!canManage && <p className="admin-help">Vous n&apos;avez pas l&apos;autorisation de modifier les permissions.</p>}
        {Object.entries(byResource).map(([resource, perms]) => (
          <div key={resource} className="permission-resource-group">
            <h3>{resource}</h3>
            <div className="permissions-list compact">
              {perms.map((perm) => (
                <PermissionToggle
                  key={perm.id}
                  roleId={role.id}
                  permission={perm}
                  granted={rolePermIds.has(perm.id)}
                  disabled={!canManage}
                />
              ))}
            </div>
          </div>
        ))}
      </article>
    </section>
  );
}
