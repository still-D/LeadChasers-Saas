"use client";

import { useActionState } from "react";
import { updateRoleAction } from "../../actions";
import type { Role } from "@/lib/permissions";

export function UpdateRoleForm({ role }: { role: Role }) {
  const [state, action, pending] = useActionState(updateRoleAction, { status: "idle" });

  return (
    <form action={action} className="admin-form compact">
      <input type="hidden" name="roleId" value={role.id} />
      {state.status === "error" && state.message && <div className="admin-banner error">{state.message}</div>}
      {state.status === "success" && state.message && <div className="admin-banner success">{state.message}</div>}
      <label className="field">
        Nom
        <input name="name" defaultValue={role.name} required minLength={2} maxLength={120} />
      </label>
      <label className="field">
        Description
        <input name="description" defaultValue={role.description ?? ""} maxLength={500} />
      </label>
      <button className="button" type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</button>
    </form>
  );
}
