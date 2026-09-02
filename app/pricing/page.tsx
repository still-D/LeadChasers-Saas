import Link from "next/link";
import { ArrowRight, FileCheck2, FileClock, ReceiptText } from "lucide-react";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requireEmployeePermission } from "@/lib/auth";
import { listClients } from "@/lib/clients";
import { hasPermission } from "@/lib/permissions";
import { listQuotes, listServiceCatalog } from "@/lib/pricing";
import { listProjects } from "@/lib/projects";
import { getWorkspaceProps } from "@/lib/workspace";
import { PricingStudio } from "./pricing-studio";

const quoteLabels: Record<string, string> = { draft: "Brouillon", sent: "Envoyé", accepted: "Accepté", rejected: "Refusé", expired: "Expiré" };

export default async function PricingPage() {
  const session = await requireEmployeePermission("pricing.view");
  const cooperativeId = session.profile.cooperative_id;
  const [items, clients, projects, quotes, shell, canCreateQuote] = await Promise.all([
    listServiceCatalog(cooperativeId), listClients(cooperativeId), listProjects(cooperativeId), listQuotes(cooperativeId),
    getWorkspaceProps(session), hasPermission(session.userId, "quotes.create"),
  ]);
  const accepted = quotes.filter((quote) => quote.status === "accepted");
  const open = quotes.filter((quote) => ["draft", "sent"].includes(quote.status));

  return <WorkspaceShell {...shell}>
    <header className="page-heading"><div><p className="page-eyebrow">DIRECTION COMMERCIALE</p><h1>Tarifs & devis</h1><p>Composez une offre cohérente pendant l’appel, puis transformez-la en devis contrôlé.</p></div></header>
    <section className="mini-metric-grid quote-metrics"><article><ReceiptText size={18} /><div><small>Devis récents</small><strong>{quotes.length}</strong></div></article><article><FileClock size={18} /><div><small>Valeur ouverte</small><strong>{open.reduce((sum, quote) => sum + quote.total, 0).toLocaleString("fr-MA")} MAD</strong></div></article><article><FileCheck2 size={18} /><div><small>Valeur acceptée</small><strong>{accepted.reduce((sum, quote) => sum + quote.total, 0).toLocaleString("fr-MA")} MAD</strong></div></article></section>
    <PricingStudio items={items} clients={clients.map((client) => ({ id: client.id, label: client.company || client.name }))} projects={projects.map((project) => ({ id: project.id, label: `${project.code} — ${project.title}` }))} canCreateQuote={canCreateQuote} />
    <section className="panel recent-quotes"><div className="panel-heading"><div><p>HISTORIQUE</p><h2>Derniers devis</h2></div></div><div className="quote-table-wrap"><table className="data-table"><thead><tr><th>Référence</th><th>Client / projet</th><th>Date</th><th>Validité</th><th>Montant</th><th>Statut</th><th /></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><td><strong>{quote.quote_number}</strong></td><td><div><strong>{quote.client?.company || quote.client?.name || "Client à confirmer"}</strong><small>{quote.project ? `${quote.project.code} · ${quote.project.title}` : "Non rattaché"}</small></div></td><td>{new Intl.DateTimeFormat("fr-MA").format(new Date(quote.created_at))}</td><td>{quote.valid_until ? new Intl.DateTimeFormat("fr-MA").format(new Date(`${quote.valid_until}T12:00:00`)) : "—"}</td><td><strong>{quote.total.toLocaleString("fr-MA")} MAD</strong></td><td><span className={`status-pill quote-${quote.status}`}>{quoteLabels[quote.status]}</span></td><td>{quote.project && <Link href={`/projects/${quote.project.id}`}><ArrowRight size={15} /></Link>}</td></tr>)}</tbody></table>{!quotes.length && <div className="panel-empty"><ReceiptText size={24} /><strong>Aucun devis</strong><p>Votre premier brouillon apparaîtra ici.</p></div>}</div></section>
  </WorkspaceShell>;
}
