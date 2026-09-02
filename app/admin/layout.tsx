import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requireEmployeeSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getWorkspaceProps } from "@/lib/workspace";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireEmployeeSession();

  const [canMembers, canRoles, canAudit, canSettings] = await Promise.all([
    hasPermission(session.userId, "members.view"),
    hasPermission(session.userId, "roles.view"),
    hasPermission(session.userId, "audit_logs.view"),
    hasPermission(session.userId, "system.settings"),
  ]);
  if (![canMembers, canRoles, canAudit, canSettings].some(Boolean)) redirect("/access-denied");
  const shell = await getWorkspaceProps(session);

  return (
    <WorkspaceShell {...shell}>
      <header className="page-heading"><div><p className="page-eyebrow">ADMINISTRATION</p><h1>Équipe & accès</h1><p>Gérez l’organisation sans compromettre le principe du moindre privilège.</p></div></header>
      <nav className="admin-tabs" aria-label="Administration">
        {canMembers && <Link href="/admin/members">Membres</Link>}
        {canRoles && <Link href="/admin/roles">Rôles & permissions</Link>}
        {canSettings && <Link href="/admin/departments">Départements</Link>}
        {canAudit && <Link href="/admin/audit-logs">Journal d&apos;audit</Link>}
      </nav>
      <div className="admin-content">{children}</div>
    </WorkspaceShell>
  );
}
