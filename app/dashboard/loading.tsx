import { Brand } from "../components/brand";

export default function DashboardLoading() {
  return (
    <main className="dashboard">
      <nav className="dashboard-nav">
        <Brand />
        <div className="user-chip"><b>LC</b>LeadChasers OS</div>
      </nav>
      <section className="dashboard-main">
        <header className="dashboard-heading">
          <div className="loading-skeleton skeleton-title" />
          <div className="loading-skeleton skeleton-text" />
        </header>
        <section className="skeleton-grid">
          <div className="loading-skeleton skeleton-card" />
          <div className="loading-skeleton skeleton-card" />
          <div className="loading-skeleton skeleton-card" />
          <div className="loading-skeleton skeleton-card" />
        </section>
        <section className="project-layout">
          <div className="loading-skeleton" style={{ height: 240 }} />
          <div className="loading-skeleton" style={{ height: 240 }} />
        </section>
      </section>
    </main>
  );
}
