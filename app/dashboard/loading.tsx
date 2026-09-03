import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Calculator,
  ChevronRight,
  ContactRound,
  LayoutDashboard,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Brand } from "../components/brand";

const navigationIcons = [
  LayoutDashboard,
  BriefcaseBusiness,
  ContactRound,
  Calculator,
  BarChart3,
  UsersRound,
];

function SkeletonLine({ className = "" }: { className?: string }) {
  return <span className={`loading-skeleton dashboard-loading-line ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="workspace-shell dashboard-loading-shell" aria-busy="true">
      <p className="loading-status" role="status" aria-live="polite">
        Chargement du tableau de bord…
      </p>

      <div className="mobile-menu dashboard-loading-menu" aria-hidden="true">
        <Menu size={20} />
      </div>

      <aside className="workspace-sidebar dashboard-loading-sidebar" aria-label="Navigation en cours de chargement">
        <div className="sidebar-brand-row"><Brand /></div>
        <div className="workspace-indicator" aria-hidden="true">
          <BriefcaseBusiness size={18} />
          <div><strong>Media Coop</strong><small>Espace opérationnel</small></div>
        </div>

        <nav className="workspace-nav dashboard-loading-nav" aria-hidden="true">
          <p>ESPACE DE TRAVAIL</p>
          {navigationIcons.slice(0, 4).map((Icon, index) => (
            <span className={`dashboard-loading-nav-item ${index === 0 ? "active" : ""}`} key={index}>
              <Icon size={19} strokeWidth={1.8} />
            </span>
          ))}
          <p className="nav-section-title">PILOTAGE</p>
          {navigationIcons.slice(4).map((Icon, index) => (
            <span className="dashboard-loading-nav-item" key={index}>
              <Icon size={19} strokeWidth={1.8} />
            </span>
          ))}
        </nav>

        <div className="sidebar-bottom" aria-hidden="true">
          <span className="dashboard-loading-bottom-item"><Settings2 size={18} /></span>
          <div className="sidebar-profile dashboard-loading-profile">
            <span className="profile-avatar loading-skeleton" />
          </div>
        </div>
      </aside>

      <div className="workspace-stage">
        <header className="workspace-topbar">
          <div className="topbar-context"><span>Accueil</span><ChevronRight size={13} /><strong>Vue d’ensemble</strong></div>
          <div className="topbar-right" aria-hidden="true">
            <div className="command-search"><Search size={15} /><span>Rechercher…</span><kbd>⌘ K</kbd></div>
            <span className="secure-pill"><ShieldCheck size={15} /> <span>Interne</span></span>
            <span className="loading-skeleton dashboard-loading-topbar-control" />
            <span className="topbar-icon dashboard-loading-static-icon"><Bell size={16} /></span>
            <span className="topbar-avatar loading-skeleton" />
          </div>
        </header>

        <main className="workspace-content dashboard-loading-content" aria-hidden="true">
          <header className="page-heading dashboard-loading-heading">
            <div className="dashboard-loading-heading-copy">
              <SkeletonLine className="short" />
              <SkeletonLine className="title" />
              <SkeletonLine className="subtitle" />
            </div>
            <span className="loading-skeleton dashboard-loading-action" />
          </header>

          <section className="metric-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <article className="metric-card dashboard-loading-metric" key={index}>
                <span className="loading-skeleton dashboard-loading-metric-icon" />
                <div>
                  <SkeletonLine className="label" />
                  <SkeletonLine className="value" />
                  <SkeletonLine className="detail" />
                </div>
              </article>
            ))}
          </section>

          <section className="dashboard-row dashboard-row-main">
            <article className="panel dashboard-loading-panel dashboard-loading-agenda">
              <div className="panel-heading dashboard-loading-panel-heading">
                <div><SkeletonLine className="label" /><SkeletonLine className="heading" /></div>
                <SkeletonLine className="link" />
              </div>
              <div className="dashboard-loading-list">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="dashboard-loading-agenda-row" key={index}>
                    <span className="loading-skeleton dashboard-loading-date" />
                    <div><SkeletonLine className="item-title" /><SkeletonLine className="item-copy" /></div>
                    <SkeletonLine className="progress" />
                    <SkeletonLine className="badge" />
                  </div>
                ))}
              </div>
            </article>

            <article className="panel dashboard-loading-panel dashboard-loading-attention">
              <div className="panel-heading dashboard-loading-panel-heading">
                <div><SkeletonLine className="label" /><SkeletonLine className="heading" /></div>
                <span className="loading-skeleton dashboard-loading-count" />
              </div>
              <div className="dashboard-loading-list">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="dashboard-loading-attention-row" key={index}>
                    <span className="loading-skeleton dashboard-loading-dot" />
                    <div><SkeletonLine className="item-title" /><SkeletonLine className="item-copy" /></div>
                    <SkeletonLine className="tiny" />
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="panel pipeline-panel dashboard-loading-pipeline">
            <div className="panel-heading dashboard-loading-panel-heading">
              <div><SkeletonLine className="label" /><SkeletonLine className="heading wide" /></div>
              <SkeletonLine className="total" />
            </div>
            <div className="pipeline-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="pipeline-column dashboard-loading-pipeline-column" key={index}>
                  <SkeletonLine className="column-title" />
                  <span className="loading-skeleton dashboard-loading-pipeline-card" />
                  <span className="loading-skeleton dashboard-loading-pipeline-card small" />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
