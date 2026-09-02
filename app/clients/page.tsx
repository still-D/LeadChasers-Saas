import { Building2, Mail, Phone, Plus, Search, UsersRound } from "lucide-react";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requireEmployeePermission } from "@/lib/auth";
import { listClients } from "@/lib/clients";
import { hasPermission } from "@/lib/permissions";
import { getWorkspaceProps } from "@/lib/workspace";
import { ClientForm } from "./client-form";

const statusLabels: Record<string, string> = { lead: "Lead", qualified: "Qualifié", client: "Client", inactive: "Inactif" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const session = await requireEmployeePermission("clients.view");
  const [clients, shell, canCreate] = await Promise.all([listClients(session.profile.cooperative_id), getWorkspaceProps(session), hasPermission(session.userId, "clients.create")]);
  const params = await searchParams;
  const q = params.q?.toLowerCase().trim() ?? "";
  const filtered = clients.filter((client) => (!params.status || client.status === params.status) && (!q || `${client.name} ${client.company ?? ""} ${client.email ?? ""}`.toLowerCase().includes(q)));
  const activeValue = clients.filter((client) => client.status !== "inactive").reduce((sum, client) => sum + client.project_value, 0);

  return <WorkspaceShell {...shell}>
    <header className="page-heading"><div><p className="page-eyebrow">CRM COOPÉRATIF</p><h1>Clients & prospects</h1><p>Centralisez le contexte commercial avant qu’il ne se perde dans les appels.</p></div>{canCreate && <a className="primary-action" href="#new-client"><Plus size={17} /> Nouveau contact</a>}</header>
    <section className="mini-metric-grid"><article><UsersRound size={18} /><div><small>Contacts</small><strong>{clients.length}</strong></div></article><article><Building2 size={18} /><div><small>Clients actifs</small><strong>{clients.filter((c) => c.status === "client").length}</strong></div></article><article><span className="currency-icon">MAD</span><div><small>Valeur projets</small><strong>{activeValue.toLocaleString("fr-MA")} MAD</strong></div></article></section>
    <section className="panel list-panel">
      <div className="list-toolbar"><form method="get"><label><Search size={16} /><input name="q" defaultValue={params.q} placeholder="Nom, entreprise ou email" /></label><label><select name="status" defaultValue={params.status}><option value="">Tous les statuts</option><option value="lead">Leads</option><option value="qualified">Qualifiés</option><option value="client">Clients</option><option value="inactive">Inactifs</option></select></label><button type="submit">Filtrer</button></form><span>{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span></div>
      <div className="client-grid">{filtered.map((client) => <article className="client-card" key={client.id}><header><span>{client.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{client.company || client.name}</strong><small>{client.company ? client.name : "Contact principal"}</small></div><b className={`status-pill client-${client.status}`}>{statusLabels[client.status]}</b></header><div className="client-contact">{client.email && <a href={`mailto:${client.email}`}><Mail size={14} />{client.email}</a>}{client.phone && <a href={`tel:${client.phone}`}><Phone size={14} />{client.phone}</a>}</div><footer><span><small>Productions</small><strong>{client.project_count}</strong></span><span><small>Valeur</small><strong>{client.project_value.toLocaleString("fr-MA")} MAD</strong></span></footer></article>)}</div>
      {!filtered.length && <div className="panel-empty"><UsersRound size={24} /><strong>Aucun contact trouvé</strong><p>Ajoutez un prospect pour commencer le suivi commercial.</p></div>}
    </section>
    {canCreate && <section className="panel creation-panel" id="new-client"><div className="section-intro"><p>NOUVEAU CONTACT</p><h2>Ajouter au portefeuille</h2><span>Une fiche claire pour garder le besoin, le contexte et la prochaine étape.</span></div><ClientForm /></section>}
  </WorkspaceShell>;
}
