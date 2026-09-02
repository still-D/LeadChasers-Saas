import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireEmployeeSession } from "@/lib/auth";
import { listDepartments, listRoles } from "@/lib/permissions";
import { MemberCreateForm } from "./member-create-form";

export default async function NewMemberPage() {
  const session = await requireEmployeeSession();
  if (!session.profile.is_founder) redirect("/access-denied");
  const [departments, roles] = await Promise.all([listDepartments(), listRoles()]);
  return <section><Link className="inline-back" href="/admin/members"><ArrowLeft size={15} /> Retour aux membres</Link><header className="admin-section-header"><div><p className="page-eyebrow">ACCÈS PROFESSIONNEL</p><h1>Inviter un membre</h1><p>Attribuez dès maintenant le département et le rôle correspondant à sa fonction.</p></div></header><article className="panel creation-panel"><MemberCreateForm departments={departments.filter((item) => item.active)} roles={roles.filter((item) => item.active)} /></article></section>;
}
