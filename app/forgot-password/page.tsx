import { Brand } from "@/app/components/brand";
import { ResetForm } from "./reset-form";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <aside className="auth-aside compact"><Brand /><div className="auth-promise"><p className="eyebrow"><span /> ACCÈS INTERNE</p><h1>Revenez<br /><em>aux commandes.</em></h1><p>Un lien de récupération à durée limitée sera envoyé à votre adresse professionnelle.</p></div><div className="auth-sun" /></aside>
      <section className="auth-panel"><ResetForm /></section>
    </main>
  );
}
