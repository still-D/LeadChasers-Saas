"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialForgotPasswordState: ForgotPasswordState = { status: "idle" };

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialForgotPasswordState);
  return (
    <form className="form-card" action={action}>
      <div className="auth-kicker"><span /> RÉCUPÉRATION SÉCURISÉE</div>
      <h2>Retrouver votre accès.</h2>
      <p>Saisissez votre adresse professionnelle. Le message reste volontairement neutre pour protéger les comptes.</p>
      <label className="field">ADRESSE EMAIL
        <input required name="email" type="email" autoComplete="email" placeholder="vous@leadchasers.ma" />
      </label>
      <button className="button" type="submit" disabled={pending}>{pending ? "Envoi…" : "Envoyer le lien"}</button>
      {state.message && <p className={`form-notice ${state.status}`} role="status">{state.message}</p>}
      <Link className="back-link" href="/login">← Retour à la connexion</Link>
    </form>
  );
}
