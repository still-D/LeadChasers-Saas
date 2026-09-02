import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleDollarSign, Clock3, MapPin, UserRound } from "lucide-react";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requireEmployeePermission } from "@/lib/auth";
import { getProjectBriefs } from "@/lib/briefs";
import { hasPermission } from "@/lib/permissions";
import { getProjectById, listProductionPhases } from "@/lib/projects";
import { getWorkspaceProps } from "@/lib/workspace";
import { BriefForm } from "./brief-form";
import { BriefsSection } from "./briefs-section";
import { TimelineControl } from "./timeline-control";

const productionLabels: Record<string, string> = { event: "Événementiel", corporate: "Film corporate", livestream: "Live streaming", postproduction: "Post-production", drone: "Drone", studio: "Studio" };
const statusLabels: Record<string, string> = { planning: "Planification", preproduction: "Pré-production", production: "Production", postproduction: "Post-production", delivery: "Livraison", archived: "Archivé" };
const dealLabels: Record<string, string> = { discovery: "Découverte", proposal: "Proposition", negotiation: "Négociation", won: "Gagné / signé", lost: "Perdu", on_hold: "En attente" };

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ brief?: string }> }) {
  const session = await requireEmployeePermission("projects.view");
  const { id } = await params;
  const [{ brief }, project, shell] = await Promise.all([searchParams, getProjectById(id, session.profile.cooperative_id), getWorkspaceProps(session)]);
  if (!project) notFound();
  const [canViewTimeline, canEditTimeline, canCreateBrief] = await Promise.all([
    hasPermission(session.userId, "production.view"), hasPermission(session.userId, "production.edit"), hasPermission(session.userId, "documents.upload"),
  ]);
  const [phases, briefsResult] = await Promise.all([
    canViewTimeline ? listProductionPhases(project.id, session.profile.cooperative_id) : Promise.resolve([]),
    getProjectBriefs(project.id),
  ]);
  const briefs = briefsResult.ok ? briefsResult.briefs : [];
  const eventDate = new Date(`${project.event_date}T12:00:00`);

  return <WorkspaceShell {...shell}>
    <Link className="inline-back" href="/projects"><ArrowLeft size={15} /> Toutes les productions</Link>
    <header className="project-hero">
      <div><div className="project-tags"><span className="project-code">{project.code}</span><span className={`status-pill status-${project.status}`}>{statusLabels[project.status]}</span><span className={`priority-chip ${project.priority}`}>{project.priority}</span></div><h1>{project.title}</h1><p>{project.brief_summary || "Le besoin détaillé reste à documenter avec le client."}</p></div>
      <div className="project-progress-ring" style={{ "--progress": `${project.progress * 3.6}deg` } as React.CSSProperties}><span><strong>{project.progress}%</strong><small>AVANCEMENT</small></span></div>
    </header>

    <section className="project-facts">
      <article><span><UserRound size={17} /></span><div><small>CLIENT</small><strong>{project.client?.company || project.client?.name || "À confirmer"}</strong><em>{project.client?.company ? project.client.name : "Contact non rattaché"}</em></div></article>
      <article><span><CalendarDays size={17} /></span><div><small>PRODUCTION</small><strong>{new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "long", year: "numeric" }).format(eventDate)}</strong><em>{productionLabels[project.production_type]}</em></div></article>
      <article><span><MapPin size={17} /></span><div><small>LIEU</small><strong>{project.location || "À confirmer"}</strong><em>Logistique de tournage</em></div></article>
      <article><span><CircleDollarSign size={17} /></span><div><small>VALEUR DU DEAL</small><strong>{Number(project.budget_quoted).toLocaleString("fr-MA")} MAD</strong><em>{dealLabels[project.deal_status]}</em></div></article>
      <article><span><Clock3 size={17} /></span><div><small>LIVRAISON</small><strong>{project.deadline ? new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${project.deadline}T12:00:00`)) : "À confirmer"}</strong><em>Échéance finale</em></div></article>
    </section>

    <section className="project-work-grid">
      <article className="panel timeline-panel"><div className="panel-heading"><div><p>WORKFLOW</p><h2>Timeline de production</h2></div><span>{phases.filter((phase) => phase.status === "completed").length} / {phases.length} étapes</span></div>{phases.length ? <TimelineControl phases={phases} projectId={project.id} canEdit={canEditTimeline} /> : <div className="panel-empty"><strong>{canViewTimeline ? "Timeline non initialisée" : "Accès production requis"}</strong><p>{canViewTimeline ? "Appliquez la migration opérations pour créer les étapes." : "Votre rôle permet de consulter le dossier, mais pas le workflow de production."}</p></div>}</article>
      <aside className="panel project-side-panel"><div className="panel-heading"><div><p>DOSSIER</p><h2>Contrôle production</h2></div></div><dl><div><dt>Type</dt><dd>{productionLabels[project.production_type]}</dd></div><div><dt>Deal</dt><dd>{dealLabels[project.deal_status]}</dd></div><div><dt>Priorité</dt><dd className={`priority-text ${project.priority}`}>{project.priority}</dd></div><div><dt>Créé le</dt><dd>{new Intl.DateTimeFormat("fr-MA").format(new Date(project.created_at))}</dd></div><div><dt>Dernière mise à jour</dt><dd>{new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(project.updated_at))}</dd></div></dl></aside>
    </section>

    <section className="brief-work-grid">
      {canCreateBrief && <article className="panel brief-create-panel"><div className="panel-heading"><div><p>DOCUMENTATION</p><h2>Nouvelle fiche technique</h2></div></div>{brief === "created" && <p className="form-notice success">Fiche technique créée avec succès.</p>}<BriefForm projectId={project.id} projectTitle={project.title} /></article>}
      <article className="panel"><BriefsSection briefs={briefs} /></article>
    </section>
  </WorkspaceShell>;
}
