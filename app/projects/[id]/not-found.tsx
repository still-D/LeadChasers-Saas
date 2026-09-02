import Link from "next/link";
import { Brand } from "@/app/components/brand";

export default function ProjectNotFound() {
  return (
    <main className="not-found-page">
      <nav className="dashboard-nav">
        <Brand />
        <Link className="button" href="/dashboard" style={{ minHeight: 38, background: "var(--gold)", color: "var(--ink)" }}>
          Tableau de bord
        </Link>
      </nav>
      <section className="not-found-main">
        <div className="not-found-card">
          <h1>Projet introuvable</h1>
          <p>Le projet que vous cherchez n&apos;existe pas ou vous n&apos;avez pas l&apos;autorisation d&apos;y accéder.</p>
          <Link className="button" href="/dashboard" style={{ background: "var(--green)", color: "#fff" }}>
            Retour au tableau de bord
          </Link>
        </div>
      </section>
    </main>
  );
}
