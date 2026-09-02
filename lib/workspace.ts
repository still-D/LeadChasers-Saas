import { hasPermission } from "@/lib/permissions";
import type { EmployeeSession } from "@/lib/auth";

export async function getWorkspaceProps(session: EmployeeSession) {
  const [projects, clients, pricing, finance, admin] = await Promise.all([
    hasPermission(session.userId, "projects.view"),
    hasPermission(session.userId, "clients.view"),
    hasPermission(session.userId, "pricing.view"),
    hasPermission(session.userId, "finance.view"),
    Promise.all([
      hasPermission(session.userId, "members.view"),
      hasPermission(session.userId, "roles.view"),
      hasPermission(session.userId, "audit_logs.view"),
    ]).then((values) => values.some(Boolean)),
  ]);
  const { profile } = session;
  return {
    profile: {
      name: `${profile.first_name} ${profile.last_name}`,
      email: session.email,
      role: profile.cooperative_position,
      initials: `${profile.first_name[0] ?? "L"}${profile.last_name[0] ?? "C"}`.toUpperCase(),
      isFounder: profile.is_founder,
    },
    access: { projects, clients, pricing, finance, admin },
  };
}
