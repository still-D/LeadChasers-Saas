import { LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requireEmployeeSession } from "@/lib/auth";
import { getWorkspaceProps } from "@/lib/workspace";
import { PasswordChangeForm } from "./password-change-form";

export default async function AccountPage() {
  const session = await requireEmployeeSession();
  const shell = await getWorkspaceProps(session);
  const { profile } = session;
  return <WorkspaceShell {...shell}>
    <header className="page-heading"><div><p className="page-eyebrow">PROFIL PROFESSIONNEL</p><h1>Mon compte</h1><p>Votre identité, votre rôle et votre niveau d’accès dans LeadChasers OS.</p></div></header>
    <section className="account-layout">
      <article className="panel profile-panel"><div className="profile-hero"><span>{shell.profile.initials}</span><div><h2>{shell.profile.name}</h2><p>{profile.cooperative_position}</p><b className="status-pill client-client">Compte actif</b></div></div><dl><div><dt><Mail size={15} /> Email professionnel</dt><dd>{session.email}</dd></div><div><dt><UserRound size={15} /> Identifiant membre</dt><dd>{profile.member_id}</dd></div><div><dt><ShieldCheck size={15} /> Rôle système</dt><dd>{profile.role.name}</dd></div><div><dt><UserRound size={15} /> Département</dt><dd>{profile.department.name}</dd></div></dl></article>
      <div className="account-stack"><article className="panel security-panel"><header><span><LockKeyhole size={18} /></span><div><p>SÉCURITÉ</p><h2>Mot de passe & sessions</h2></div></header><p>Confirmez votre mot de passe actuel avant d’en définir un nouveau. Les autres sessions seront fermées automatiquement.</p><PasswordChangeForm /></article><article className="panel access-panel"><header><span><ShieldCheck size={18} /></span><div><p>AUTORISATION</p><h2>{profile.is_founder ? "Accès fondateur protégé" : "Accès basé sur votre fonction"}</h2></div></header><p>{profile.is_founder ? "Ce compte conserve tous les droits et ne peut pas être suspendu, rétrogradé ou limité par un override." : "Vos permissions sont calculées côté serveur à partir de votre rôle et des exceptions approuvées."}</p></article></div>
    </section>
  </WorkspaceShell>;
}
