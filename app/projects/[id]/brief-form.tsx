"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createBrief } from "./brief-actions";
import { initialBriefActionState } from "./brief-action-state";

export function BriefForm({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [state, action, pending] = useActionState(
    (prev: typeof initialBriefActionState, formData: FormData) => createBrief(projectId, prev, formData),
    initialBriefActionState,
  );

  return (
    <form action={action} className="brief-form">
      <label className="field">
        TITRE DE LA FICHE TECHNIQUE
        <input
          name="title"
          placeholder={`Fiche technique — ${projectTitle}`}
          defaultValue={`Fiche technique — ${projectTitle}`}
          required
          minLength={3}
          maxLength={200}
          aria-invalid={Boolean(state.fieldErrors?.title)}
          aria-describedby={state.fieldErrors?.title ? "brief-title-error" : undefined}
        />
        {state.fieldErrors?.title && <span id="brief-title-error" className="field-error">{state.fieldErrors.title}</span>}
      </label>
      <label className="field">
        CLIENT (optionnel)
        <input
          name="clientName"
          placeholder="Nom du client ou de l'organisation"
          maxLength={120}
          aria-invalid={Boolean(state.fieldErrors?.clientName)}
          aria-describedby={state.fieldErrors?.clientName ? "brief-client-error" : undefined}
        />
        {state.fieldErrors?.clientName && <span id="brief-client-error" className="field-error">{state.fieldErrors.clientName}</span>}
      </label>
      <label className="field">
        NOTES / BRIEF
        <textarea
          name="notes"
          rows={5}
          placeholder="Décrivez les attentes, contraintes, livrables ou toute information utile à l'équipe de production."
          maxLength={4000}
          aria-invalid={Boolean(state.fieldErrors?.notes)}
          aria-describedby={state.fieldErrors?.notes ? "brief-notes-error" : undefined}
        />
        {state.fieldErrors?.notes && <span id="brief-notes-error" className="field-error">{state.fieldErrors.notes}</span>}
      </label>
      <button className="button brief-submit" disabled={pending} type="submit">
        {pending ? "Génération en cours…" : "Générer la fiche technique →"}
      </button>
      {state.status === "error" && state.message && (
        <p className="brief-result error" role="status">
          {state.message}
          {state.limitReached && (
            <> <Link href="/pricing">Voir les forfaits →</Link></>
          )}
        </p>
      )}
    </form>
  );
}
