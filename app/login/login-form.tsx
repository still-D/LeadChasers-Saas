"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "./actions";
import { initialLoginActionState } from "./action-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialLoginActionState);
  return (
    <form className="login-form-card" action={action}>
      <label className="login-field">
        <span>Adresse email professionnelle</span>
        <input
          required
          name="email"
          type="email"
          placeholder="vous@leadchasers.ma"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
        {state.fieldErrors?.email && <span id="email-error" className="field-error">{state.fieldErrors.email}</span>}
      </label>
      <label className="login-field">
        <span>Mot de passe</span>
        <input
          required
          name="password"
          type="password"
          placeholder="Votre mot de passe"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
        />
        {state.fieldErrors?.password && <span id="password-error" className="field-error">{state.fieldErrors.password}</span>}
      </label>
      {state.status === "error" && state.message && <p className="project-result error" role="status">{state.message}</p>}
      <Link className="login-forgot" href="/forgot-password">Mot de passe oublié ?</Link>
      <button className="login-submit" disabled={pending} type="submit">{pending ? "Connexion…" : "Se connecter"}</button>
      <p className="login-security">Compte professionnel <strong>@leadchasers.ma</strong> uniquement</p>
    </form>
  );
}
