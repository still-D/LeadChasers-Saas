"use client";

import { useActionState } from "react";
import { createRoleAction } from "../actions";

export function CreateRoleForm() {
  const [state, action, pending] = useActionState(createRoleAction, { status: "idle" });

  return (
    <form action={action} className="admin-form compact">
      {state.status === "error" && state.message && <div className="admin-banner error">{state.message}</div>}
      {state.status === "success" && state.message && <div className="admin-banner success">{state.message}</div>}
      <label className="field">
        Nom
        <input name="name" required minLength={2} maxLength={120} />
      </label>
      <label className="field">
        Slug
        <input name="slug" required pattern="^[a-z0-9_-]+$" title="lettres minuscules, chiffres, tirets, underscores" />
      </label>
      <label className="field">
        Description
        <input name="description" maxLength={500} />
      </label>
      <button className="button" type="submit" disabled={pending}>{pending ? "Création..." : "Créer"}</button>
    </form>
  );
}
