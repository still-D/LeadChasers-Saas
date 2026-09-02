import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type ClientStatus = "lead" | "qualified" | "client" | "inactive";
export type Client = {
  id: string;
  cooperative_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: "referral" | "social" | "website" | "outbound" | "partner" | "returning" | "other";
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  project_count: number;
  project_value: number;
};

export async function listClients(cooperativeId: string): Promise<Client[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("clients")
    .select("id, cooperative_id, name, company, email, phone, source, status, notes, created_at, projects(id, budget_quoted)")
    .eq("cooperative_id", cooperativeId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((row) => {
    const projects = (row.projects ?? []) as { id: string; budget_quoted: number }[];
    return {
      ...row,
      projects: undefined,
      project_count: projects.length,
      project_value: projects.reduce((sum, project) => sum + Number(project.budget_quoted), 0),
    } as Client;
  });
}
