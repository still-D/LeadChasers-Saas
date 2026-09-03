import { Brand } from "../components/brand";
import { ThemeToggle } from "../components/theme-toggle";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-mosaic" aria-hidden="true" suppressHydrationWarning>
        <article><small>PRODUCTION 024</small><strong>Film corporate</strong><span>Pré-production</span></article>
        <article><small>PIPELINE</small><strong>8 opportunités</strong><span>245K MAD</span></article>
        <article><small>PLANNING</small><strong>Équipe terrain</strong><span>Jeu. 09:30</span></article>
        <article><small>POST-PRODUCTION</small><strong>Version client 03</strong><span>En révision</span></article>
        <article><small>CLIENT</small><strong>Brief validé</strong><span>Livraison 18 juin</span></article>
        <article><small>STUDIO</small><strong>Caméra · Son · Lumière</strong><span>Matériel confirmé</span></article>
        <article><small>DEVIS LC-2026-18</small><strong>32 500 MAD</strong><span>Envoyé au client</span></article>
        <article><small>COORDINATION</small><strong>7 étapes synchronisées</strong><span>Aucun blocage</span></article>
      </div>
      <div className="login-shade" suppressHydrationWarning />
      <section className="login-stage">
        <ThemeToggle className="login-theme-toggle" />
        <div className="login-brand" suppressHydrationWarning><Brand /></div>
        <div className="login-welcome" suppressHydrationWarning>
          <p>LEADCHASERS COMMAND CENTER</p>
          <h1>Bienvenue dans votre espace.</h1>
          <span>Pilotez les clients, les équipes et chaque production au même endroit.</span>
        </div>
        <LoginForm />
        <footer><span>© {new Date().getFullYear()} LeadChasers Media Coop</span><a href="mailto:support@leadchasers.ma">Assistance</a><span>Accès privé</span></footer>
      </section>
    </main>
  );
}
