import { redirect } from "next/navigation";
import { hasSupabaseConfig, createSupabaseServerClient } from "@/lib/supabase/server";
import { getMemberProfile, hasPermission, listAuditLogs } from "@/lib/permissions";

export default async function AuditLogsPage() {
  if (!hasSupabaseConfig()) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await hasPermission(user.id, "audit_logs.view");
  if (!allowed) redirect("/dashboard");

  const profile = await getMemberProfile(user.id);
  if (!profile) redirect("/login");
  const logs = await listAuditLogs(profile.cooperative_id, 200);

  return (
    <section>
      <header className="admin-section-header">
        <h1>Journaux d&apos;audit</h1>
      </header>

      <article className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Acteur</th>
              <th>Action</th>
              <th>Ressource</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString("fr-MA")}</td>
                <td>{log.actor_user_id ? log.actor_user_id.slice(0, 8) : "Système"}</td>
                <td><code>{log.action}</code></td>
                <td>{log.resource_type}</td>
                <td>{log.resource_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="empty-state">Aucun événement enregistré.</p>}
      </article>
    </section>
  );
}
