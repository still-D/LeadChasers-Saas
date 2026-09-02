import Link from "next/link";
import type { ProjectBrief } from "@/lib/briefs";

export function BriefsSection({ briefs }: { briefs: ProjectBrief[] }) {
  return (
    <section className="briefs-section">
      <h2>Fiches techniques</h2>
      {briefs.length === 0 ? (
        <p className="empty-briefs">Aucune fiche technique pour ce projet. Générez la première ci-dessous.</p>
      ) : (
        <ul className="brief-list">
          {briefs.map((brief) => (
            <li key={brief.id} className="brief-item">
              <div className="brief-item-main">
                <strong>{brief.title}</strong>
                <small>
                  {new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(brief.created_at))}
                  {brief.client_name ? ` · ${brief.client_name}` : ""}
                </small>
              </div>
              <Link className="button button-small" href={`/api/briefs/${brief.id}/pdf`} target="_blank" rel="noopener noreferrer">
                Voir le PDF
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
