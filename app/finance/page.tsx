import { Banknote, CircleDollarSign, FileClock, TrendingUp } from "lucide-react";
import { WorkspaceShell } from "@/app/components/workspace-shell";
import { requireEmployeePermission } from "@/lib/auth";
import { listQuotes } from "@/lib/pricing";
import { listProjects } from "@/lib/projects";
import { getWorkspaceProps } from "@/lib/workspace";

export default async function FinancePage() {
  const session = await requireEmployeePermission("finance.view");
  const cooperativeId = session.profile.cooperative_id;
  const [projects, quotes, shell] = await Promise.all([listProjects(cooperativeId), listQuotes(cooperativeId), getWorkspaceProps(session)]);
  const signed = projects.filter((project) => project.deal_status === "won").reduce((sum, project) => sum + Number(project.budget_quoted), 0);
  const accepted = quotes.filter((quote) => quote.status === "accepted").reduce((sum, quote) => sum + quote.total, 0);
  const open = quotes.filter((quote) => ["draft", "sent"].includes(quote.status)).reduce((sum, quote) => sum + quote.total, 0);
  return <WorkspaceShell {...shell}>
    <header className="page-heading"><div><p className="page-eyebrow">PILOTAGE FINANCIER</p><h1>Finance</h1><p>Une lecture nette de la valeur signée et du portefeuille de devis.</p></div></header>
    <section className="metric-grid finance-metrics"><article className="metric-card"><span className="metric-icon green"><CircleDollarSign size={19} /></span><div><p>Deals signés</p><strong>{signed.toLocaleString("fr-MA")} MAD</strong><small>valeur projets gagnés</small></div></article><article className="metric-card"><span className="metric-icon gold"><Banknote size={19} /></span><div><p>Devis acceptés</p><strong>{accepted.toLocaleString("fr-MA")} MAD</strong><small>sur les devis enregistrés</small></div></article><article className="metric-card"><span className="metric-icon blue"><FileClock size={19} /></span><div><p>Portefeuille ouvert</p><strong>{open.toLocaleString("fr-MA")} MAD</strong><small>à convertir</small></div></article><article className="metric-card"><span className="metric-icon dark"><TrendingUp size={19} /></span><div><p>Taux de signature</p><strong>{quotes.length ? `${Math.round((quotes.filter((quote) => quote.status === "accepted").length / quotes.length) * 100)}%` : "—"}</strong><small>devis acceptés</small></div></article></section>
    <section className="panel finance-note"><p>BASE FINANCIÈRE</p><h2>Vue de direction prête à évoluer</h2><span>Les transactions, dépenses, marges et règlements pourront être ajoutés à ce module sans exposer ces données aux équipes non financières. Les accès CFO sont déjà isolés par permission.</span></section>
  </WorkspaceShell>;
}
