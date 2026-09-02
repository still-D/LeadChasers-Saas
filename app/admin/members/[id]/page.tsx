import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabaseConfig, createSupabaseServerClient } from "@/lib/supabase/server";
import { getMemberById, getMemberProfile, getRolePermissions, getUserOverrides, hasPermission, listPermissions, listDepartments, listRoles } from "@/lib/permissions";
import { StatusActions } from "./status-actions";
import { OverrideForm } from "./override-form";
import { MemberEditForm } from "./member-edit-form";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await hasPermission(user.id, "members.view");
  if (!allowed) redirect("/dashboard");

  const { id } = await params;
  const [member, currentUserProfile, allPermissions, departments, roles] = await Promise.all([
    getMemberById(id),
    getMemberProfile(user.id),
    listPermissions(),
    listDepartments(),
    listRoles(),
  ]);

  if (!member || !currentUserProfile) redirect("/admin/members");
  if (member.cooperative_id !== currentUserProfile.cooperative_id) redirect("/admin/members");

  const [rolePermissions, overrides] = await Promise.all([
    getRolePermissions(member.role_id),
    getUserOverrides(member.user_id),
  ]);

  const canEdit = await hasPermission(user.id, "members.edit");
  const canManagePermissions = await hasPermission(user.id, "permissions.manage");
  const canSuspend = await hasPermission(user.id, "members.suspend");

  const rolePermSlugs = new Set(rolePermissions.map((p) => p.slug));
  const overrideMap = new Map(overrides.map((o) => [o.permission.slug, o.effect]));

  const statusLabel: Record<string, string> = { invited: "Invité", active: "Actif", suspended: "Suspendu", deactivated: "Désactivé" };

  return (
    <section>
      <header className="admin-section-header">
        <h1>{member.first_name} {member.last_name}</h1>
        <Link className="button button-small" href="/admin/members">← Retour</Link>
      </header>

      <div className="admin-grid two">
        <article className="admin-card">
          <h2>Informations personnelles</h2>
          <div className="project-detail-row"><span>ID membre</span><span>{member.member_id}</span></div>
          <div className="project-detail-row"><span>Nom</span><span>{member.first_name} {member.last_name}</span></div>
          <div className="project-detail-row"><span>Email</span><span>{member.email}</span></div>
          <div className="project-detail-row"><span>Téléphone</span><span>{member.phone ?? "—"}</span></div>
          <div className="project-detail-row"><span>Occupation</span><span>{member.occupation}</span></div>
        </article>

        <article className="admin-card">
          <h2>Informations coopératives</h2>
          <div className="project-detail-row"><span>Poste</span><span>{member.cooperative_position}</span></div>
          <div className="project-detail-row"><span>Département</span><span>{member.department.name}</span></div>
          <div className="project-detail-row"><span>Rôle</span><span>{member.role.name}</span></div>
          <div className="project-detail-row"><span>Statut</span><span className={`badge ${member.status}`}>{statusLabel[member.status]}</span></div>
          {member.is_founder ? (
            <p className="admin-help founder-notice">Compte fondateur protégé · accès intégral non révocable</p>
          ) : canSuspend ? (
            <StatusActions memberId={member.id} currentStatus={member.status} />
          ) : null}
        </article>
      </div>

      {canEdit && (
        <article className="admin-card">
          <h2>Modifier le profil</h2>
          <MemberEditForm member={member} departments={departments} roles={roles} />
        </article>
      )}

      <article className="admin-card">
        <h2>Permissions effectives</h2>
        <p className="admin-help">
          {member.is_founder
            ? "Le fondateur conserve toujours l’intégralité des permissions."
            : "Ordre de résolution : deny override > allow override > rôle CEO > permission de rôle."}
        </p>
        <div className="permissions-list">
          {allPermissions.map((perm) => {
            const fromRole = rolePermSlugs.has(perm.slug);
            const override = overrideMap.get(perm.slug);
            let effective = member.is_founder || fromRole;
            if (override === "deny") effective = false;
            if (override === "allow") effective = true;
            if (member.role.slug === "ceo" || member.is_founder) effective = true;

            return (
              <div key={perm.id} className={`permission-row ${effective ? "allowed" : "denied"}`}>
                <span>{perm.slug}</span>
                <span>{perm.name}</span>
                <span>{fromRole ? "Rôle" : "—"}</span>
                <span>{override ? `Override ${override}` : "—"}</span>
                <span>{effective ? "✓ Autorisé" : "✗ Refusé"}</span>
              </div>
            );
          })}
        </div>
      </article>

      {canManagePermissions && !member.is_founder && (
        <article className="admin-card">
          <h2>Overrides individuels</h2>
          <OverrideForm memberId={member.id} permissions={allPermissions} overrides={overrides} />
        </article>
      )}
    </section>
  );
}
