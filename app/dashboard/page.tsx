import Link from "next/link";
import { ArrowRight, CalendarDays, CircleDollarSign, Clock3, ContactRound, Film, Plus, TrendingUp } from "lucide-react";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requireEmployeePermission } from "@/lib/auth";
import { getOperationsSummary, listProjects } from "@/lib/projects";
import { getWorkspaceProps } from "@/lib/workspace";

const statusLabels: Record<string, string> = {
  planning: "Planification", preproduction: "Pré-production", production: "En production",
  postproduction: "Post-production", delivery: "Livraison", archived: "Archivé",
};
const dealLabels: Record<string, string> = {
  discovery: "Découverte", proposal: "Proposition", negotiation: "Négociation", won: "Gagné", lost: "Perdu", on_hold: "En attente",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`;
}

export default async function DashboardPage() {
  const session = await requireEmployeePermission("projects.view");
  const [projects, summary, shell] = await Promise.all([
    listProjects(session.profile.cooperative_id),
    getOperationsSummary(session.profile.cooperative_id),
    getWorkspaceProps(session),
  ]);
  const activeProjects = projects.filter((project) => project.status !== "archived");
  const liveProjects = projects.filter((project) => ["production", "postproduction"].includes(project.status));
  const wonValue = projects.filter((project) => project.deal_status === "won").reduce((sum, project) => sum + Number(project.budget_quoted), 0);
  const nextProject = activeProjects.filter((project) => new Date(`${project.event_date}T23:59:59`) >= new Date())[0];
  const today = new Intl.DateTimeFormat("fr-MA", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const pipeline = ["discovery", "proposal", "negotiation", "won"].map((stage) => ({
    stage,
    items: projects.filter((project) => project.deal_status === stage),
  }));

  return (
    <WorkspaceShell {...shell}>
      <header className="page-heading">
        <div><p className="page-eyebrow">{today}</p><h1>Bonjour, {session.profile.first_name}.</h1><p>Voici ce qui demande votre attention aujourd’hui.</p></div>
        <Link className="primary-action" href="/projects#new-project"><Plus size={17} /> Nouvelle production</Link>
      </header>

      <section className="metric-grid" aria-label="Indicateurs clés">
        <article className="metric-card"><span className="metric-icon green"><Film size={19} /></span><div><p>Productions actives</p><strong>{activeProjects.length.toString().padStart(2, "0")}</strong><small><TrendingUp size={12} /> {liveProjects.length} en réalisation</small></div></article>
        <article className="metric-card"><span className="metric-icon gold"><CircleDollarSign size={19} /></span><div><p>Valeur signée</p><strong>{formatMoney(wonValue)}</strong><small>{summary.openQuotes} devis encore ouverts</small></div></article>
        <article className="metric-card"><span className="metric-icon blue"><ContactRound size={19} /></span><div><p>Portefeuille client</p><strong>{summary.clients.toString().padStart(2, "0")}</strong><small>contacts actifs et qualifiés</small></div></article>
        <article className="metric-card"><span className="metric-icon dark"><CalendarDays size={19} /></span><div><p>Prochaine production</p><strong>{nextProject ? new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "short" }).format(new Date(`${nextProject.event_date}T12:00:00`)) : "—"}</strong><small>{nextProject?.title ?? "Rien de planifié"}</small></div></article>
      </section>

      <section className="dashboard-row dashboard-row-main">
        <article className="panel upcoming-panel">
          <div className="panel-heading"><div><p>PRODUCTION</p><h2>À l’agenda</h2></div><Link href="/projects">Tout voir <ArrowRight size={14} /></Link></div>
          <div className="upcoming-list">
            {activeProjects.slice(0, 5).map((project) => (
              <Link href={`/projects/${project.id}`} className="upcoming-item" key={project.id}>
                <div className="date-tile"><strong>{new Intl.DateTimeFormat("fr-MA", { day: "2-digit" }).format(new Date(`${project.event_date}T12:00:00`))}</strong><span>{new Intl.DateTimeFormat("fr-MA", { month: "short" }).format(new Date(`${project.event_date}T12:00:00`))}</span></div>
                <div className="upcoming-copy"><strong>{project.title}</strong><span>{project.client?.company || project.client?.name || "Client à confirmer"} · {project.location || "Lieu à confirmer"}</span></div>
                <div className="progress-cell"><span><i style={{ width: `${project.progress}%` }} /></span><small>{project.progress}%</small></div>
                <span className={`status-pill status-${project.status}`}>{statusLabels[project.status]}</span>
                <ArrowRight size={15} />
              </Link>
            ))}
            {!activeProjects.length && <div className="panel-empty"><Film size={24} /><strong>Aucune production active</strong><p>Créez le premier projet pour lancer votre pipeline.</p></div>}
          </div>
        </article>

        <aside className="panel attention-panel">
          <div className="panel-heading"><div><p>FOCUS</p><h2>À surveiller</h2></div><span className="count-badge">{projects.filter((p) => p.priority === "urgent" || p.deal_status === "negotiation").length}</span></div>
          <div className="attention-list">
            {projects.filter((p) => p.priority === "urgent" || p.deal_status === "negotiation").slice(0, 4).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}><span className={project.priority === "urgent" ? "attention-dot red" : "attention-dot gold"} /><div><strong>{project.title}</strong><small>{project.priority === "urgent" ? "Priorité urgente" : "Deal en négociation"}</small></div><Clock3 size={15} /></Link>
            ))}
            {!projects.some((p) => p.priority === "urgent" || p.deal_status === "negotiation") && <div className="attention-clear"><span>✓</span><strong>Tout est sous contrôle</strong><small>Aucun blocage prioritaire.</small></div>}
          </div>
        </aside>
      </section>

      <section className="panel pipeline-panel">
        <div className="panel-heading"><div><p>COMMERCIAL</p><h2>Pipeline des opportunités</h2></div><span className="pipeline-total">{formatMoney(projects.filter((p) => !["lost"].includes(p.deal_status)).reduce((sum, p) => sum + Number(p.budget_quoted), 0))}</span></div>
        <div className="pipeline-grid">
          {pipeline.map((column) => <div className="pipeline-column" key={column.stage}><header><span>{dealLabels[column.stage]}</span><b>{column.items.length}</b></header>{column.items.slice(0, 3).map((project) => <Link href={`/projects/${project.id}`} key={project.id}><small>{project.code}</small><strong>{project.title}</strong><span>{project.client?.company || project.client?.name || "Nouveau prospect"}</span><b>{formatMoney(Number(project.budget_quoted))}</b></Link>)}{!column.items.length && <div className="pipeline-empty">Aucune opportunité</div>}</div>)}
        </div>
      </section>
    </WorkspaceShell>
  );
}
