import { createSupabaseServiceClient, hasSupabaseConfig } from "@/lib/supabase/server";

export type ProjectStatus = "planning" | "preproduction" | "production" | "postproduction" | "delivery" | "archived";
export type ProductionType = "event" | "corporate" | "livestream" | "postproduction" | "drone" | "studio";
export type DealStatus = "discovery" | "proposal" | "negotiation" | "won" | "lost" | "on_hold";
export type ProjectPriority = "low" | "normal" | "high" | "urgent";
export type PhaseStatus = "pending" | "in_progress" | "blocked" | "completed";

export type DashboardProject = {
  id: string;
  code: string;
  title: string;
  production_type: ProductionType;
  status: ProjectStatus;
  event_date: string;
  location: string | null;
  budget_quoted: number;
  client_id: string | null;
  deal_status: DealStatus;
  priority: ProjectPriority;
  progress: number;
  deadline: string | null;
  client: { id: string; name: string; company: string | null } | null;
};

export type ProjectDetail = DashboardProject & {
  cooperative_id: string;
  created_by: string;
  brief_summary: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductionPhase = {
  id: string;
  project_id: string;
  phase: "discovery" | "proposal" | "preproduction" | "production" | "postproduction" | "client_review" | "delivery";
  status: PhaseStatus;
  position: number;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
};

const projectSelect = "id, code, title, production_type, status, event_date, location, budget_quoted, client_id, deal_status, priority, progress, deadline, clients:client_id (id, name, company)";

function toDashboardProject(row: Record<string, unknown>): DashboardProject {
  const relation = row.clients;
  const client = Array.isArray(relation) ? relation[0] : relation;
  return { ...row, client: (client ?? null) as DashboardProject["client"] } as DashboardProject;
}

export async function listProjects(cooperativeId: string): Promise<DashboardProject[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select(projectSelect)
    .eq("cooperative_id", cooperativeId)
    .order("event_date", { ascending: true });
  if (error) {
    console.error("Project list failed", { code: error.code });
    return [];
  }
  return (data ?? []).map((row) => toDashboardProject(row));
}

export async function getProjectById(id: string, cooperativeId: string): Promise<ProjectDetail | null> {
  if (!hasSupabaseConfig()) return null;
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .select(`${projectSelect}, cooperative_id, created_by, brief_summary, start_date, created_at, updated_at`)
    .eq("id", id)
    .eq("cooperative_id", cooperativeId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return toDashboardProject(data) as ProjectDetail;
}

export async function listProductionPhases(projectId: string, cooperativeId: string): Promise<ProductionPhase[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("production_phases")
    .select("id, project_id, phase, status, position, due_date, completed_at, notes, projects!inner(cooperative_id)")
    .eq("project_id", projectId)
    .eq("projects.cooperative_id", cooperativeId)
    .order("position", { ascending: true });
  return (data ?? []).map((phase) => ({
    id: phase.id,
    project_id: phase.project_id,
    phase: phase.phase,
    status: phase.status,
    position: phase.position,
    due_date: phase.due_date,
    completed_at: phase.completed_at,
    notes: phase.notes,
  }) as ProductionPhase);
}

export async function getOperationsSummary(cooperativeId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { clients: 0, openQuotes: 0, pipelineValue: 0 };
  const [clients, quotes] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("cooperative_id", cooperativeId).neq("status", "inactive"),
    supabase.from("quotes").select("total, status").eq("cooperative_id", cooperativeId).in("status", ["draft", "sent"]),
  ]);
  return {
    clients: clients.count ?? 0,
    openQuotes: quotes.data?.length ?? 0,
    pipelineValue: (quotes.data ?? []).reduce((sum, quote) => sum + Number(quote.total), 0),
  };
}
