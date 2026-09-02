"use client";

import { useActionState } from "react";
import { initialProjectActionState } from "./action-state";
import { createProject } from "./actions";

type ClientOption = { id: string; name: string; company: string | null };

export function CreateProjectForm({ clients }: { clients: ClientOption[] }) {
  const [state, action, pending] = useActionState(createProject, initialProjectActionState);
  return (
    <form action={action} className="operations-form">
      {state.message && <div className={`form-notice ${state.status}`} role="status">{state.message}</div>}
      <div className="form-section"><div><span>01</span><h3>Client & opportunité</h3></div><div className="form-grid">
        <label className="field span-2">NOM DE LA PRODUCTION<input required name="title" maxLength={120} placeholder="Ex. Campagne marque employeur" />{state.fieldErrors?.title && <small>{state.fieldErrors.title}</small>}</label>
        <label className="field">CLIENT<select name="clientId" defaultValue=""><option value="">Prospect à confirmer</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company || client.name}</option>)}</select></label>
        <label className="field">ÉTAPE DU DEAL<select name="dealStatus" defaultValue="discovery"><option value="discovery">Découverte</option><option value="proposal">Proposition</option><option value="negotiation">Négociation</option><option value="won">Gagné / signé</option><option value="on_hold">En attente</option><option value="lost">Perdu</option></select></label>
        <label className="field">BUDGET / DEAL (MAD)<input name="budget" type="number" min="0" step="50" defaultValue="0" /></label>
        <label className="field">PRIORITÉ<select name="priority" defaultValue="normal"><option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option></select></label>
      </div></div>
      <div className="form-section"><div><span>02</span><h3>Cadre de production</h3></div><div className="form-grid">
        <label className="field">TYPE<select name="productionType" defaultValue="corporate"><option value="corporate">Film corporate</option><option value="event">Événementiel</option><option value="livestream">Live streaming</option><option value="postproduction">Post-production</option><option value="drone">Drone</option><option value="studio">Studio</option></select></label>
        <label className="field">DATE DE PRODUCTION<input required name="eventDate" type="date" />{state.fieldErrors?.eventDate && <small>{state.fieldErrors.eventDate}</small>}</label>
        <label className="field">DATE DE LIVRAISON<input name="deadline" type="date" />{state.fieldErrors?.deadline && <small>{state.fieldErrors.deadline}</small>}</label>
        <label className="field">LIEU<input name="location" maxLength={160} placeholder="Casablanca, Maroc" /></label>
        <label className="field span-2">BESOIN / RÉSULTAT ATTENDU<textarea name="briefSummary" rows={4} maxLength={2000} placeholder="Objectif du client, audience, livrables, contraintes et critères de réussite…" /></label>
      </div></div>
      <div className="form-submit-row"><p>Le code projet et la timeline de production seront générés automatiquement.</p><button className="primary-action" disabled={pending} type="submit">{pending ? "Création…" : "Créer la production →"}</button></div>
    </form>
  );
}
