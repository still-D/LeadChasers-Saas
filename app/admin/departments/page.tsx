import { redirect } from "next/navigation";
import { hasSupabaseConfig, createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPermission, listDepartments } from "@/lib/permissions";
import { DepartmentForm } from "./department-form";

export default async function DepartmentsPage() {
  if (!hasSupabaseConfig()) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await hasPermission(user.id, "system.settings");
  if (!allowed) redirect("/dashboard");

  const departments = await listDepartments();

  return (
    <section>
      <header className="admin-section-header">
        <h1>Départements</h1>
      </header>

      <div className="admin-grid two">
        <article className="admin-card">
          <h2>Départements existants</h2>
          <table className="admin-table">
            <thead>
              <tr><th>Nom</th><th>Description</th><th>Actif</th></tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.description}</td>
                  <td>{d.active ? "Oui" : "Non"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-card">
          <h2>Créer un département</h2>
          <DepartmentForm />
        </article>
      </div>
    </section>
  );
}
