"use client";

import { useActionState } from "react";
import { updatePassword, type PasswordState } from "./actions";

const initialPasswordState: PasswordState = { status: "idle" };

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialPasswordState);
  return (
    <form className="form-card" action={action}>
      <div className="auth-kicker"><span /> PROTECTION DU COMPTE</div>
      <h2>Définir votre mot de passe.</h2>
      <p>12 caractères minimum, avec une majuscule, une minuscule, un chiffre et un symbole.</p>
      <label className="field">NOUVEAU MOT DE PASSE<input required name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" /></label>
      <label className="field">CONFIRMATION<input required name="confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" /></label>
      <button className="button" type="submit" disabled={pending}>{pending ? "Sécurisation…" : "Activer mon accès"}</button>
      {state.message && <p className="form-notice error" role="alert">{state.message}</p>}
    </form>
  );
}
