"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEmployeePermission } from "@/lib/auth";
import { logAudit } from "@/lib/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const statusSchema = z.enum(["pending", "in_progress", "blocked", "completed"]);
const idSchema = z.string().uuid();

const projectStatusByPhase: Record<string, string> = {
  discovery: "planning", proposal: "planning", preproduction: "preproduction",
  production: "production", postproduction: "postproduction", client_review: "delivery", delivery: "delivery",
};

export async function updatePhaseStatus(phaseId: string, projectId: string, value: string): Promise<{ ok: boolean; message: string }> {
  const session = await requireEmployeePermission("production.edit");
  const parsedPhaseId = idSchema.safeParse(phaseId);
  const parsedProjectId = idSchema.safeParse(projectId);
  const parsedStatus = statusSchema.safeParse(value);
  if (!parsedPhaseId.success || !parsedProjectId.success || !parsedStatus.success) return { ok: false, message: "Mise à jour invalide." };

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, message: "Base de données indisponible." };
  const { data: phase } = await supabase
    .from("production_phases")
    .select("id, phase, project_id, projects!inner(cooperative_id)")
    .eq("id", parsedPhaseId.data)
    .eq("project_id", parsedProjectId.data)
    .eq("projects.cooperative_id", session.profile.cooperative_id)
    .limit(1)
    .maybeSingle();
  if (!phase) return { ok: false, message: "Étape introuvable." };

  const completedAt = parsedStatus.data === "completed" ? new Date().toISOString() : null;
  const { error } = await supabase.from("production_phases").update({ status: parsedStatus.data, completed_at: completedAt, updated_by: session.userId }).eq("id", phase.id);
  if (error) return { ok: false, message: "L’étape n’a pas pu être mise à jour." };

  const { data: phases } = await supabase.from("production_phases").select("phase, status, position").eq("project_id", parsedProjectId.data).order("position");
  const progress = phases?.length ? Math.round((phases.filter((item) => item.status === "completed").length / phases.length) * 100) : 0;
  const activePhase = [...(phases ?? [])].reverse().find((item) => item.status === "completed" || item.status === "in_progress");
  await supabase.from("projects").update({ progress, status: projectStatusByPhase[activePhase?.phase ?? "discovery"] ?? "planning" }).eq("id", parsedProjectId.data).eq("cooperative_id", session.profile.cooperative_id);
  await logAudit(session.userId, "production.phase_updated", "production_phase", phase.id, { project_id: projectId, status: parsedStatus.data });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true, message: "Timeline mise à jour." };
}
