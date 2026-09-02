import { Brand } from "../components/brand";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Brand />
        <div className="auth-promise">
          <p className="eyebrow"><span /> ACCÈS CONTRÔLÉ</p>
          <h1>Une équipe.<br /><em>Un accès maîtrisé.</em></h1>
          <p>LeadChasers OS est un environnement privé réservé aux membres de la coopérative.</p>
        </div>
        <div className="auth-sun" />
      </aside>
      <section className="auth-panel">
        <div className="form-card invite-only-card">
          <div className="auth-kicker"><span /> SUR INVITATION UNIQUEMENT</div>
          <h2>Création de compte désactivée.</h2>
          <p>Les comptes professionnels sont créés par le fondateur. Si vous rejoignez l&apos;équipe, utilisez le lien sécurisé reçu sur votre adresse <strong>@leadchasers.ma</strong>.</p>
          <Link className="button" href="/login">Retour à la connexion <span>→</span></Link>
        </div>
      </section>
    </main>
  );
}
