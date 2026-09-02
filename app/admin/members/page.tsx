import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabaseConfig, createSupabaseServerClient } from "@/lib/supabase/server";
import { getMemberProfile, hasPermission, listMembers, listDepartments, listRoles } from "@/lib/permissions";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ status?: string; role?: string; department?: string; q?: string }> }) {
  if (!hasSupabaseConfig()) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await hasPermission(user.id, "members.view");
  if (!allowed) redirect("/dashboard");

  const profile = await getMemberProfile(user.id);
  if (!profile) redirect("/login");
  const [members, departments, roles] = await Promise.all([listMembers(profile.cooperative_id), listDepartments(), listRoles()]);
  const params = await searchParams;

  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  let filtered = members;
  if (params.status) filtered = filtered.filter((m) => m.status === params.status);
  if (params.role) filtered = filtered.filter((m) => m.role_id === params.role);
  if (params.department) filtered = filtered.filter((m) => m.department_id === params.department);
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      (m.email?.toLowerCase().includes(q) ?? false) ||
      m.member_id.toLowerCase().includes(q)
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { invited: "Invité", active: "Actif", suspended: "Suspendu", deactivated: "Désactivé" };
    return <span className={`badge ${status}`}>{map[status] ?? status}</span>;
  };

  return (
    <section>
      <header className="admin-section-header">
        <h1>Membres</h1>
        {profile.is_founder && <Link className="primary-action" href="/admin/members/new">+ Nouveau membre</Link>}
      </header>

      <form className="admin-filters" method="get">
        <input className="filter-input" name="q" placeholder="Rechercher..." defaultValue={params.q} />
        <select className="filter-select" name="status" defaultValue={params.status}>
          <option value="">Tous les statuts</option>
          <option value="invited">Invité</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
          <option value="deactivated">Désactivé</option>
        </select>
        <select className="filter-select" name="role" defaultValue={params.role}>
          <option value="">Tous les rôles</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="filter-select" name="department" defaultValue={params.department}>
          <option value="">Tous les départements</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="button button-small" type="submit">Filtrer</button>
      </form>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Email</th>
              <th>Poste</th>
              <th>Département</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <tr key={member.id}>
                <td>{member.member_id}</td>
                <td>
                  <strong>{member.first_name} {member.last_name}</strong>
                  {member.is_founder && <span className="founder-label">Fondateur</span>}
                </td>
                <td>{member.email}</td>
                <td>{member.cooperative_position}</td>
                <td>{deptMap.get(member.department_id)?.name}</td>
                <td>{roleMap.get(member.role_id)?.name}</td>
                <td>{statusBadge(member.status)}</td>
                <td><Link className="text-link" href={`/admin/members/${member.id}`}>Voir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="empty-state">Aucun membre ne correspond aux critères.</p>}
      </div>
    </section>
  );
}
