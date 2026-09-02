import Link from "next/link";
import { ArrowRight, CalendarRange, Filter, LayoutGrid, List as ListIcon, Plus, Search } from "lucide-react";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requireEmployeePermission } from "@/lib/auth";
import { listClients } from "@/lib/clients";
import { hasPermission } from "@/lib/permissions";
import { listProjects } from "@/lib/projects";
import { getWorkspaceProps } from "@/lib/workspace";
import { CreateProjectForm } from "./create-project-form";

const statuses: Record<string, string> = {
  planning: "Planification",
  preproduction: "Pré-production",
  production: "Production",
  postproduction: "Post-production",
  delivery: "Livraison",
  archived: "Archivé",
};

const boardGroups = [
  { id: "todo", label: "À faire", statuses: ["planning", "preproduction"] },
  { id: "progress", label: "En cours", statuses: ["production", "postproduction"] },
  { id: "review", label: "En révision", statuses: ["delivery"] },
  { id: "ready", label: "Terminé", statuses: ["archived"] },
];

type ViewMode = "board" | "list" | "timeline";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; view?: string }>;
}) {
  const session = await requireEmployeePermission("projects.view");
  const [projects, clients, shell, canCreate] = await Promise.all([
    listProjects(session.profile.cooperative_id),
    listClients(session.profile.cooperative_id),
    getWorkspaceProps(session),
    hasPermission(session.userId, "projects.create"),
  ]);
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const view: ViewMode = params.view === "board" || params.view === "timeline" ? params.view : "list";
  const filtered = projects.filter((project) =>
    (!params.status || project.status === params.status) &&
    (!query || `${project.code} ${project.title} ${project.client?.name ?? ""} ${project.client?.company ?? ""}`.toLowerCase().includes(query)),
  );

  const viewHref = (nextView: ViewMode) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.status) next.set("status", params.status);
    next.set("view", nextView);
    return `/projects?${next.toString()}`;
  };

  return (
    <WorkspaceShell {...shell}>
      <header className="page-heading">
        <div><p className="page-eyebrow">OPÉRATIONS</p><h1>Productions</h1><p>Du premier échange à la livraison finale, chaque décision reste visible.</p></div>
        {canCreate && <a className="primary-action" href="#new-project"><Plus size={17} /> Nouvelle production</a>}
      </header>

      <div className="workspace-viewbar">
        <nav className="view-switcher" aria-label="Mode d’affichage">
          <Link className={view === "board" ? "active" : ""} href={viewHref("board")}><LayoutGrid size={15} /> Tableau</Link>
          <Link className={view === "list" ? "active" : ""} href={viewHref("list")}><ListIcon size={15} /> Liste</Link>
          <Link className={view === "timeline" ? "active" : ""} href={viewHref("timeline")}><CalendarRange size={15} /> Timeline</Link>
        </nav>
        <span>{filtered.length} production{filtered.length > 1 ? "s" : ""}</span>
      </div>

      <section className="panel list-panel">
        <div className="list-toolbar">
          <form method="get">
            <input type="hidden" name="view" value={view} />
            <label><Search size={16} /><input name="q" defaultValue={params.q} placeholder="Rechercher par projet, code ou client" /></label>
            <label><Filter size={15} /><select name="status" defaultValue={params.status}><option value="">Tous les statuts</option>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <button type="submit">Filtrer</button>
          </form>
          <span>Données synchronisées</span>
        </div>

        {view === "list" && (
          <div className="project-table-wrap">
            <table className="data-table">
              <thead><tr><th>Production</th><th>Client</th><th>Étape</th><th>Échéance</th><th>Progression</th><th>Valeur</th><th /></tr></thead>
              <tbody>{filtered.map((project) => (
                <tr key={project.id}>
                  <td><span className={`priority-mark ${project.priority}`} /><div><strong>{project.title}</strong><small>{project.code} · {project.location || "Lieu à confirmer"}</small></div></td>
                  <td><strong>{project.client?.company || project.client?.name || "—"}</strong></td>
                  <td><span className={`status-pill status-${project.status}`}>{statuses[project.status]}</span></td>
                  <td>{formatDate(project.event_date)}</td>
                  <td><div className="table-progress"><span><i style={{ width: `${project.progress}%` }} /></span><small>{project.progress}%</small></div></td>
                  <td><strong>{Number(project.budget_quoted).toLocaleString("fr-MA")} MAD</strong></td>
                  <td><Link href={`/projects/${project.id}`} aria-label={`Ouvrir ${project.title}`}><ArrowRight size={16} /></Link></td>
                </tr>
              ))}</tbody>
            </table>
            {!filtered.length && <div className="panel-empty"><strong>Aucun résultat</strong><p>Modifiez les filtres ou créez une nouvelle production.</p></div>}
          </div>
        )}

        {view === "board" && (
          <div className="project-board">
            {boardGroups.map((group) => {
              const items = filtered.filter((project) => group.statuses.includes(project.status));
              return (
                <section className="board-column" key={group.id}>
                  <header><div><span>{group.label}</span><b>{items.length}</b></div><Plus size={15} /></header>
                  <div>{items.map((project) => (
                    <Link className="board-project" href={`/projects/${project.id}`} key={project.id}>
                      <small>{project.code}</small><strong>{project.title}</strong>
                      <span>{project.client?.company || project.client?.name || "Client à confirmer"}</span>
                      <footer><em>{formatDate(project.event_date)}</em><b>{project.progress}%</b></footer>
                    </Link>
                  ))}{!items.length && <p className="board-empty">Aucune production</p>}</div>
                </section>
              );
            })}
          </div>
        )}

        {view === "timeline" && (
          <div className="project-timeline-list">
            {filtered.map((project) => (
              <Link href={`/projects/${project.id}`} key={project.id}>
                <div><small>{project.code}</small><strong>{project.title}</strong><span>{project.client?.company || project.client?.name || "Client à confirmer"}</span></div>
                <time dateTime={project.event_date}>{formatDate(project.event_date)}</time>
                <div className="timeline-project-progress"><span><i style={{ width: `${project.progress}%` }} /></span><b>{project.progress}%</b></div>
                <ArrowRight size={16} />
              </Link>
            ))}
            {!filtered.length && <div className="panel-empty"><strong>Aucune échéance</strong><p>Les productions planifiées apparaîtront ici.</p></div>}
          </div>
        )}
      </section>

      {canCreate && <section id="new-project" className="panel creation-panel"><div className="section-intro"><p>NOUVEAU DOSSIER</p><h2>Créer une production</h2><span>Rassemblez le besoin client, la valeur du deal et les dates clés.</span></div><CreateProjectForm clients={clients.map(({ id, name, company }) => ({ id, name, company }))} /></section>}
    </WorkspaceShell>
  );
}
