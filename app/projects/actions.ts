"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEmployeePermission } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/permissions";
import { projectSchema, type ProjectActionState } from "./action-state";

export async function createProject(_: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const session = await requireEmployeePermission("projects.create");
  const parsed = projectSchema.safeParse({
    title: formData.get("title"), clientId: formData.get("clientId") || "",
    productionType: formData.get("productionType"), eventDate: formData.get("eventDate"),
    deadline: formData.get("deadline") || "", location: formData.get("location") || undefined,
    budget: formData.get("budget") || 0, dealStatus: formData.get("dealStatus"),
    priority: formData.get("priority"), briefSummary: formData.get("briefSummary") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: ProjectActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof typeof fieldErrors;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Vérifiez les informations de la production.", fieldErrors };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "error", message: "Connexion à la base de données indisponible." };
  const cooperativeId = session.profile.cooperative_id;
  if (parsed.data.clientId) {
    const { data: client } = await supabase.from("clients").select("id").eq("id", parsed.data.clientId).eq("cooperative_id", cooperativeId).maybeSingle();
    if (!client) return { status: "error", message: "Le client sélectionné est invalide." };
  }

  const year = Number(parsed.data.eventDate.slice(0, 4));
  const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).eq("cooperative_id", cooperativeId).gte("event_date", `${year}-01-01`).lte("event_date", `${year}-12-31`);
  let project: { id: string } | null = null;
  for (let attempt = 1; attempt <= 3 && !project; attempt += 1) {
    const code = `LC-${year}-${String((count ?? 0) + attempt).padStart(3, "0")}`;
    const { data, error } = await supabase.from("projects").insert({
      cooperative_id: cooperativeId, created_by: session.userId, code,
      title: parsed.data.title, production_type: parsed.data.productionType,
      event_date: parsed.data.eventDate, start_date: new Date().toISOString().slice(0, 10),
      deadline: parsed.data.deadline || null, location: parsed.data.location || null,
      budget_quoted: parsed.data.budget, client_id: parsed.data.clientId || null,
      deal_status: parsed.data.dealStatus, priority: parsed.data.priority,
      brief_summary: parsed.data.briefSummary || null, status: "planning", progress: 5,
    }).select("id").single();
    if (!error) project = data;
    else if (error.code !== "23505") return { status: "error", message: "La production n’a pas pu être enregistrée." };
  }
  if (!project) return { status: "error", message: "Impossible d’attribuer un numéro de production. Réessayez." };

  await logAudit(session.userId, "project.created", "project", project.id, { title: parsed.data.title });
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}
