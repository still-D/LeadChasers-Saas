import { Brand } from "@/app/components/brand";

export default function ProjectLoading() {
  return (
    <main className="project-page">
      <nav className="dashboard-nav">
        <Brand />
      </nav>
      <section className="project-main">
        <div className="loading-skeleton skeleton-text" />
        <header className="project-header">
          <div>
            <div className="loading-skeleton skeleton-text" style={{ width: 80, marginBottom: 12 }} />
            <div className="loading-skeleton skeleton-title" />
            <div className="loading-skeleton skeleton-text" />
          </div>
        </header>
        <section className="skeleton-grid">
          <div className="loading-skeleton skeleton-card" />
          <div className="loading-skeleton skeleton-card" />
          <div className="loading-skeleton skeleton-card" />
          <div className="loading-skeleton skeleton-card" />
        </section>
        <section className="project-layout">
          <div className="loading-skeleton" style={{ height: 320 }} />
          <div className="loading-skeleton" style={{ height: 320 }} />
        </section>
      </section>
    </main>
  );
}
