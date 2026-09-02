"use client";

import { useActionState } from "react";
import { createClient, initialClientActionState } from "./actions";

export function ClientForm() {
  const [state, action, pending] = useActionState(createClient, initialClientActionState);
  return <form action={action} className="operations-form compact-form">
    {state.message && <div className={`form-notice ${state.status}`} role="status">{state.message}</div>}
    <div className="form-grid">
      <label className="field">CONTACT PRINCIPAL<input required name="name" maxLength={140} placeholder="Nom et prénom" />{state.fieldErrors?.name && <small>{state.fieldErrors.name}</small>}</label>
      <label className="field">ENTREPRISE / MARQUE<input name="company" maxLength={160} placeholder="Organisation" /></label>
      <label className="field">EMAIL<input name="email" type="email" maxLength={254} placeholder="contact@entreprise.ma" />{state.fieldErrors?.email && <small>{state.fieldErrors.email}</small>}</label>
      <label className="field">TÉLÉPHONE<input name="phone" maxLength={40} placeholder="+212 6…" /></label>
      <label className="field">SOURCE<select name="source" defaultValue="referral"><option value="referral">Recommandation</option><option value="social">Réseaux sociaux</option><option value="website">Site web</option><option value="outbound">Prospection</option><option value="partner">Partenaire</option><option value="returning">Client récurrent</option><option value="other">Autre</option></select></label>
      <label className="field">STATUT<select name="status" defaultValue="lead"><option value="lead">Nouveau lead</option><option value="qualified">Qualifié</option><option value="client">Client</option><option value="inactive">Inactif</option></select></label>
      <label className="field span-2">CONTEXTE & BESOINS<textarea name="notes" rows={4} maxLength={4000} placeholder="Besoins exprimés, préférences, prochaine étape…" /></label>
    </div>
    <div className="form-submit-row"><p>Les coordonnées restent visibles uniquement aux rôles autorisés.</p><button className="primary-action" disabled={pending} type="submit">{pending ? "Enregistrement…" : "Ajouter le contact →"}</button></div>
  </form>;
}
