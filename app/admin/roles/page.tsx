import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabaseConfig, createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPermission, listRoles } from "@/lib/permissions";
import { CreateRoleForm } from "./create-role-form";

export default async function RolesPage() {
  if (!hasSupabaseConfig()) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await hasPermission(user.id, "roles.view");
  if (!allowed) redirect("/dashboard");

  const roles = await listRoles();

  return (
    <section>
      <header className="admin-section-header">
        <h1>Rôles</h1>
      </header>

      <div className="admin-grid two">
        <article className="admin-card">
          <h2>Rôles existants</h2>
          <table className="admin-table">
            <thead>
              <tr><th>Nom</th><th>Slug</th><th>Système</th><th>Actif</th><th></th></tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td><strong>{role.name}</strong></td>
                  <td><code>{role.slug}</code></td>
                  <td>{role.is_system_role ? "Oui" : "Non"}</td>
                  <td>{role.active ? "Oui" : "Non"}</td>
                  <td><Link className="text-link" href={`/admin/roles/${role.id}`}>Permissions</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-card">
          <h2>Créer un rôle</h2>
          <CreateRoleForm />
        </article>
      </div>
    </section>
  );
}
