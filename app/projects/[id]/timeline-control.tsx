"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Circle, LoaderCircle } from "lucide-react";
import type { ProductionPhase } from "@/lib/projects";
import { updatePhaseStatus } from "./project-actions";

const labels: Record<string, string> = {
  discovery: "Découverte", proposal: "Proposition", preproduction: "Pré-production",
  production: "Production", postproduction: "Post-production", client_review: "Validation client", delivery: "Livraison",
};
const statusLabels: Record<string, string> = { pending: "À venir", in_progress: "En cours", blocked: "Bloqué", completed: "Terminé" };

export function TimelineControl({ phases, projectId, canEdit }: { phases: ProductionPhase[]; projectId: string; canEdit: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function update(phaseId: string, status: string) {
    startTransition(async () => {
      const result = await updatePhaseStatus(phaseId, projectId, status);
      setMessage(result.message);
    });
  }
  return <div className="timeline-wrap">
    <div className="production-timeline">{phases.map((phase, index) => <div className={`timeline-step ${phase.status}`} key={phase.id}><div className="timeline-rail"><span>{phase.status === "completed" ? <Check size={14} /> : phase.status === "blocked" ? <AlertTriangle size={13} /> : phase.status === "in_progress" ? <LoaderCircle size={14} /> : <Circle size={10} />}</span>{index < phases.length - 1 && <i />}</div><div className="timeline-copy"><small>ÉTAPE {String(phase.position).padStart(2, "0")}</small><strong>{labels[phase.phase]}</strong>{canEdit ? <select value={phase.status} disabled={pending} onChange={(event) => update(phase.id, event.target.value)} aria-label={`Statut ${labels[phase.phase]}`}><option value="pending">À venir</option><option value="in_progress">En cours</option><option value="blocked">Bloqué</option><option value="completed">Terminé</option></select> : <span>{statusLabels[phase.status]}</span>}</div></div>)}</div>
    {message && <p className="timeline-message" role="status">{message}</p>}
  </div>;
}
