"use client";

import { useState } from "react";
import { updateRolePermissionAction } from "../../actions";
import type { Permission } from "@/lib/permissions";

export function PermissionToggle({ roleId, permission, granted, disabled }: { roleId: string; permission: Permission; granted: boolean; disabled: boolean }) {
  const [checked, setChecked] = useState(granted);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle() {
    const next = !checked;
    const result = await updateRolePermissionAction(roleId, permission.id, next);
    if (result.ok) {
      setChecked(next);
    }
    setMessage(result.message);
  }

  return (
    <label className={`permission-row ${checked ? "allowed" : "denied"}`}>
      <input type="checkbox" checked={checked} onChange={toggle} disabled={disabled} />
      <span>{permission.slug}</span>
      <span>{permission.name}</span>
      {message && <span className="status-message">{message}</span>}
    </label>
  );
}
