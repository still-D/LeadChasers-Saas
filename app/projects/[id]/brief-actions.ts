"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectBrief, type BriefInput } from "@/lib/briefs";
import { requireEmployeePermission } from "@/lib/auth";
import { getProjectById } from "@/lib/projects";
import { briefSchema, type BriefActionState } from "./brief-action-state";

export async function createBrief(projectId: string, _: BriefActionState, formData: FormData): Promise<BriefActionState> {
  const session = await requireEmployeePermission("documents.upload");

  const parsed = briefSchema.safeParse({
    title: formData.get("title"),
    clientName: formData.get("clientName") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    const fieldErrors: BriefActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof typeof fieldErrors;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Vérifiez les informations de la fiche technique.", fieldErrors };
  }

  const project = await getProjectById(projectId, session.profile.cooperative_id);
  if (!project) return { status: "error", message: "Projet introuvable ou non autorisé." };

  const input: BriefInput = {
    title: parsed.data.title,
    clientName: parsed.data.clientName,
    notes: parsed.data.notes,
  };

  const briefResult = await createProjectBrief(project, input, session.userId);
  if (!briefResult.ok) {
    if (briefResult.reason === "duplicate") return { status: "error", message: "Une fiche technique identique a déjà été créée quelques secondes auparavant." };
    if (briefResult.reason === "unauthorized") return { status: "error", message: "Vous n'avez pas accès à ce projet." };
    return { status: "error", message: "La fiche technique n'a pas pu être enregistrée. Réessayez." };
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?brief=created`);
}
