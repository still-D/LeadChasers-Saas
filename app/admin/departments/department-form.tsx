"use client";

import { useActionState } from "react";
import { createDepartmentAction } from "../actions";

export function DepartmentForm() {
  const [state, action, pending] = useActionState(createDepartmentAction, { status: "idle" });

  return (
    <form action={action} className="admin-form compact">
      {state.status === "error" && state.message && <div className="admin-banner error">{state.message}</div>}
      {state.status === "success" && state.message && <div className="admin-banner success">{state.message}</div>}
      <label className="field">
        Nom
        <input name="name" required minLength={2} maxLength={120} />
      </label>
      <label className="field">
        Description
        <input name="description" maxLength={500} />
      </label>
      <label className="field">
        Actif
        <select name="active" defaultValue="true">
          <option value="true">Oui</option>
          <option value="false">Non</option>
        </select>
      </label>
      <button className="button" type="submit" disabled={pending}>{pending ? "Création..." : "Créer"}</button>
    </form>
  );
}
