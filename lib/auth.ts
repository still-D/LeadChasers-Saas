import { redirect } from "next/navigation";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { getMemberProfile, hasPermission, type MemberProfile } from "@/lib/permissions";
import { isCompanyEmail, isMatchingCompanyIdentity } from "@/lib/security";

export type EmployeeSession = {
  userId: string;
  email: string;
  profile: MemberProfile;
};

export async function getEmployeeSession(options: { allowInvited?: boolean } = {}): Promise<EmployeeSession | null> {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email || !isCompanyEmail(user.email)) return null;

  const profile = await getMemberProfile(user.id);
  if (!profile) return null;
  if (!isMatchingCompanyIdentity(user.email, profile.email)) return null;
  if (profile.status !== "active" && !(options.allowInvited && profile.status === "invited")) return null;
  if (!profile.role.active || !profile.department.active) return null;

  return { userId: user.id, email: user.email, profile };
}

export async function requireEmployeeSession(): Promise<EmployeeSession> {
  const session = await getEmployeeSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireEmployeePermission(permission: string): Promise<EmployeeSession> {
  const session = await requireEmployeeSession();
  if (!(await hasPermission(session.userId, permission))) redirect("/access-denied");
  return session;
}
