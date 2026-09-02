"use client";

import { useState } from "react";
import { updateUserOverrideAction } from "../../actions";
import type { Permission, UserPermissionOverride } from "@/lib/permissions";

export function OverrideForm({ memberId, permissions, overrides }: { memberId: string; permissions: Permission[]; overrides: UserPermissionOverride[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const overrideMap = new Map(overrides.map((o) => [o.permission_id, o.effect]));

  async function handleChange(permissionId: string, value: string) {
    const result = await updateUserOverrideAction(memberId, permissionId, value as "allow" | "deny" | "none");
    setMessage(result.message);
  }

  return (
    <div className="override-form">
      {message && <p className="admin-banner success">{message}</p>}
      <div className="permissions-list compact">
        {permissions.map((perm) => (
          <div key={perm.id} className="permission-row">
            <span>{perm.slug}</span>
            <select
              defaultValue={overrideMap.get(perm.id) ?? "none"}
              onChange={(e) => handleChange(perm.id, e.target.value)}
            >
              <option value="none">Hériter du rôle</option>
              <option value="allow">Allow explicite</option>
              <option value="deny">Deny explicite</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
