import { redirect } from "next/navigation";
import { Brand } from "@/app/components/brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PasswordForm } from "./password-form";

export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/login");
  return (
    <main className="auth-page">
      <aside className="auth-aside compact"><Brand /><div className="auth-promise"><p className="eyebrow"><span /> PREMIÈRE CONNEXION</p><h1>Votre accès.<br /><em>Votre responsabilité.</em></h1><p>Choisissez un secret unique que vous n’utilisez sur aucun autre service.</p></div><div className="auth-sun" /></aside>
      <section className="auth-panel"><PasswordForm /></section>
    </main>
  );
}
