"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEmployeePermission } from "@/lib/auth";
import { logAudit } from "@/lib/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type ClientActionState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> };
export const initialClientActionState: ClientActionState = { status: "idle" };

const schema = z.object({
  name: z.string().trim().min(2, "Le nom est requis.").max(140),
  company: z.string().trim().max(160).optional(),
  email: z.union([z.string().trim().email("Adresse email invalide.").max(254), z.literal("")]),
  phone: z.string().trim().max(40).optional(),
  source: z.enum(["referral", "social", "website", "outbound", "partner", "returning", "other"]),
  status: z.enum(["lead", "qualified", "client", "inactive"]),
  notes: z.string().trim().max(4000).optional(),
});

export async function createClient(_: ClientActionState, formData: FormData): Promise<ClientActionState> {
  const session = await requireEmployeePermission("clients.create");
  const parsed = schema.safeParse({
    name: formData.get("name"), company: formData.get("company") || undefined,
    email: formData.get("email") || "", phone: formData.get("phone") || undefined,
    source: formData.get("source"), status: formData.get("status"), notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) if (issue.path[0] && !fieldErrors[String(issue.path[0])]) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Vérifiez les informations du contact.", fieldErrors };
  }
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "error", message: "Base de données indisponible." };
  const { data, error } = await supabase.from("clients").insert({
    cooperative_id: session.profile.cooperative_id, created_by: session.userId,
    name: parsed.data.name, company: parsed.data.company || null, email: parsed.data.email || null,
    phone: parsed.data.phone || null, source: parsed.data.source, status: parsed.data.status, notes: parsed.data.notes || null,
  }).select("id").single();
  if (error || !data) return { status: "error", message: "Ce contact n’a pas pu être enregistré." };
  await logAudit(session.userId, "client.created", "client", data.id, { name: parsed.data.name });
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { status: "success", message: "Contact ajouté au portefeuille." };
}
