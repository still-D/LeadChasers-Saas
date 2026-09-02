"use client";

import { useState } from "react";
import { updateMemberStatusAction } from "../../actions";
import type { MemberStatus } from "@/lib/permissions";

export function StatusActions({ memberId, currentStatus }: { memberId: string; currentStatus: MemberStatus }) {
  const [message, setMessage] = useState<string | null>(null);

  async function setStatus(status: MemberStatus) {
    const result = await updateMemberStatusAction(memberId, status);
    setMessage(result.message);
  }

  return (
    <div className="status-actions">
      {currentStatus !== "active" && <button className="button button-small" onClick={() => setStatus("active")}>Activer</button>}
      {currentStatus !== "suspended" && <button className="button button-small" onClick={() => setStatus("suspended")}>Suspendre</button>}
      {currentStatus !== "deactivated" && <button className="button button-small" onClick={() => setStatus("deactivated")}>Désactiver</button>}
      {message && <span className="status-message">{message}</span>}
    </div>
  );
}
