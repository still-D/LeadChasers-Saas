"use client";

import { useActionState } from "react";
import { updateMemberAction } from "../../actions";
import type { MemberProfile, Department, Role } from "@/lib/permissions";

export function MemberEditForm({ member, departments, roles }: { member: MemberProfile; departments: Department[]; roles: Role[] }) {
  const [state, action, pending] = useActionState(updateMemberAction, { status: "idle" });

  return (
    <form action={action} className="admin-form">
      <input type="hidden" name="memberId" value={member.id} />
      {state.status === "error" && state.message && <div className="admin-banner error">{state.message}</div>}
      {state.status === "success" && state.message && <div className="admin-banner success">{state.message}</div>}

      <div className="admin-form-grid">
        <label className="field">
          Prénom
          <input name="firstName" defaultValue={member.first_name} required minLength={2} maxLength={80} />
        </label>
        <label className="field">
          Nom
          <input name="lastName" defaultValue={member.last_name} required minLength={2} maxLength={80} />
        </label>
        <label className="field">
          Téléphone
          <input name="phone" defaultValue={member.phone ?? ""} maxLength={40} />
        </label>
        <label className="field">
          Occupation
          <input name="occupation" defaultValue={member.occupation} maxLength={120} />
        </label>
        <label className="field">
          Poste coopératif
          <input name="cooperativePosition" defaultValue={member.cooperative_position} maxLength={120} />
        </label>
        <label className="field">
          Département
          <select name="departmentId" required defaultValue={member.department_id}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="field">
          Rôle
          {member.is_founder ? (
            <>
              <input type="hidden" name="roleId" value={member.role_id} />
              <input value={member.role.name} disabled aria-label="Rôle fondateur protégé" />
            </>
          ) : (
            <select name="roleId" required defaultValue={member.role_id}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </label>
      </div>
      <button className="button" type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</button>
    </form>
  );
}
