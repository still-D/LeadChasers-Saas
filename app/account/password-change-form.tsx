"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { KeyRound } from "lucide-react";
import { changeAccountPassword } from "./actions";
import { initialPasswordChangeActionState } from "./password-action-state";

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changeAccountPassword, initialPasswordChangeActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} className="account-password-form" action={action}>
      <label className="field">
        MOT DE PASSE ACTUEL
        <input
          required
          name="currentPassword"
          type="password"
          maxLength={128}
          autoComplete="current-password"
          aria-invalid={Boolean(state.fieldErrors?.currentPassword)}
          aria-describedby={state.fieldErrors?.currentPassword ? "current-password-error" : undefined}
        />
        {state.fieldErrors?.currentPassword && <small id="current-password-error">{state.fieldErrors.currentPassword}</small>}
      </label>
      <div className="account-password-grid">
        <label className="field">
          NOUVEAU MOT DE PASSE
          <input
            required
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={state.fieldErrors?.password ? "new-password-error" : "password-policy"}
          />
          {state.fieldErrors?.password && <small id="new-password-error">{state.fieldErrors.password}</small>}
        </label>
        <label className="field">
          CONFIRMER LE MOT DE PASSE
          <input
            required
            name="confirmation"
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            aria-invalid={Boolean(state.fieldErrors?.confirmation)}
            aria-describedby={state.fieldErrors?.confirmation ? "password-confirmation-error" : undefined}
          />
          {state.fieldErrors?.confirmation && <small id="password-confirmation-error">{state.fieldErrors.confirmation}</small>}
        </label>
      </div>
      <p id="password-policy" className="password-policy">12 caractères minimum avec majuscule, minuscule, chiffre et symbole.</p>
      {state.message && (
        <p className={`form-notice ${state.status === "success" ? "success" : "error"}`} role={state.status === "error" ? "alert" : "status"} aria-live="polite">
          {state.message}
        </p>
      )}
      <div className="account-password-actions">
        <button className="button" type="submit" disabled={pending}>
          <KeyRound size={15} /> {pending ? "Modification…" : "Modifier le mot de passe"}
        </button>
        <Link href="/forgot-password">Mot de passe oublié ?</Link>
      </div>
    </form>
  );
}
