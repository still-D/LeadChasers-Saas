import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Brand } from "@/app/components/brand";
import { getEmployeeSession } from "@/lib/auth";
import { PASSWORD_RECOVERY_COOKIE, verifyPasswordRecoveryToken } from "@/lib/password-recovery";
import { PasswordForm } from "./password-form";

export default async function UpdatePasswordPage() {
  const session = await getEmployeeSession({ allowInvited: true });
  if (!session) redirect("/login");
  const recoveryToken = (await cookies()).get(PASSWORD_RECOVERY_COOKIE)?.value;
  const isFirstLogin = session.profile.status === "invited";
  if (!isFirstLogin && !verifyPasswordRecoveryToken(recoveryToken, session.userId)) redirect("/account");
  return (
    <main className="auth-page">
      <aside className="auth-aside compact"><Brand /><div className="auth-promise"><p className="eyebrow"><span /> PREMIÈRE CONNEXION</p><h1>Votre accès.<br /><em>Votre responsabilité.</em></h1><p>Choisissez un secret unique que vous n’utilisez sur aucun autre service.</p></div><div className="auth-sun" /></aside>
      <section className="auth-panel"><PasswordForm /></section>
    </main>
  );
}
