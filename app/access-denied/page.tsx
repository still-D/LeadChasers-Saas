import Link from "next/link";
import { Brand } from "@/app/components/brand";

export default function AccessDeniedPage() {
  return <main className="denied-page"><Brand /><section><span className="status-code">403</span><h1>Accès non autorisé.</h1><p>Votre compte est connecté, mais votre rôle ne permet pas d’ouvrir cette section. Contactez Saad El Hamdani si votre mission nécessite cet accès.</p><Link className="button" href="/dashboard">Retour au tableau de bord</Link></section></main>;
}
