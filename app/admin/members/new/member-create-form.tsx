"use client";

import { useActionState } from "react";
import { createMemberAction } from "../../actions";
import { initialMemberActionState } from "../../action-state";

type Option = { id: string; name: string };

export function MemberCreateForm({ departments, roles }: { departments: Option[]; roles: Option[] }) {
  const [state, action, pending] = useActionState(createMemberAction, initialMemberActionState);
  return <form action={action} className="operations-form compact-form">
    {state.message && <div className={`form-notice ${state.status}`} role="status">{state.message}</div>}
    <div className="form-grid">
      <label className="field">PRÉNOM<input name="firstName" required minLength={2} maxLength={80} />{state.fieldErrors?.firstName && <small>{state.fieldErrors.firstName}</small>}</label>
      <label className="field">NOM<input name="lastName" required minLength={2} maxLength={80} />{state.fieldErrors?.lastName && <small>{state.fieldErrors.lastName}</small>}</label>
      <label className="field span-2">EMAIL PROFESSIONNEL<input name="email" type="email" required maxLength={254} placeholder="prenom.nom@leadchasers.ma" />{state.fieldErrors?.email && <small>{state.fieldErrors.email}</small>}</label>
      <label className="field">TÉLÉPHONE<input name="phone" maxLength={40} /></label>
      <label className="field">OCCUPATION<input name="occupation" maxLength={120} placeholder="Cadreur, monteur…" /></label>
      <label className="field span-2">FONCTION DANS LA COOPÉRATIVE<input name="cooperativePosition" maxLength={120} placeholder="Production Manager" /></label>
      <label className="field">DÉPARTEMENT<select name="departmentId" required defaultValue=""><option value="" disabled>Sélectionner</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field">RÔLE D’ACCÈS<select name="roleId" required defaultValue=""><option value="" disabled>Sélectionner</option>{roles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <div className="form-submit-row"><p>Le membre recevra un lien sécurisé pour définir son propre mot de passe.</p><button className="primary-action" type="submit" disabled={pending}>{pending ? "Création…" : "Créer et inviter →"}</button></div>
  </form>;
}
