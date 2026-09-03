"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEmployeePermission } from "@/lib/auth";
import { logAudit } from "@/lib/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type QuoteActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  clientId: z.union([z.string().uuid(), z.literal("")]),
  projectId: z.union([z.string().uuid(), z.literal("")]),
  discount: z.coerce.number().min(0).max(99),
  taxRate: z.coerce.number().min(0).max(100),
  validUntil: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
  selection: z.string().max(20_000).transform((value, context) => {
    try { return JSON.parse(value) as unknown; } catch { context.addIssue({ code: "custom", message: "Sélection invalide." }); return z.NEVER; }
  }).pipe(z.array(z.object({ serviceId: z.string().uuid(), quantity: z.number().positive().max(1000) })).min(1).max(50)),
});

export async function createQuote(_: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const session = await requireEmployeePermission("quotes.create");
  const parsed = schema.safeParse({
    clientId: formData.get("clientId") || "", projectId: formData.get("projectId") || "",
    discount: formData.get("discount") || 0, taxRate: formData.get("taxRate") || 0,
    validUntil: formData.get("validUntil") || "", selection: formData.get("selection"),
  });
  if (!parsed.success) return { status: "error", message: "Ajoutez au moins une prestation et vérifiez les paramètres." };

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "error", message: "Base de données indisponible." };
  const cooperativeId = session.profile.cooperative_id;
  const ids = [...new Set(parsed.data.selection.map((item) => item.serviceId))];
  const { data: services, error: serviceError } = await supabase.from("service_catalog").select("id, name, base_price").eq("cooperative_id", cooperativeId).eq("active", true).in("id", ids);
  if (serviceError || !services || services.length !== ids.length) return { status: "error", message: "Une prestation sélectionnée n’est plus disponible." };

  if (parsed.data.clientId) {
    const { data: client } = await supabase.from("clients").select("id").eq("id", parsed.data.clientId).eq("cooperative_id", cooperativeId).maybeSingle();
    if (!client) return { status: "error", message: "Client invalide." };
  }
  if (parsed.data.projectId) {
    const { data: project } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("cooperative_id", cooperativeId).maybeSingle();
    if (!project) return { status: "error", message: "Production invalide." };
  }

  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const items = parsed.data.selection.map((selection) => {
    const service = serviceMap.get(selection.serviceId)!;
    return { service_id: service.id, description: service.name, quantity: selection.quantity, unit_price: Number(service.base_price) };
  });
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountAmount = subtotal * (parsed.data.discount / 100);
  const taxable = subtotal - discountAmount;
  const total = taxable + taxable * (parsed.data.taxRate / 100);
  const year = new Date().getUTCFullYear();
  const { count } = await supabase.from("quotes").select("id", { count: "exact", head: true }).eq("cooperative_id", cooperativeId).gte("created_at", `${year}-01-01T00:00:00Z`);
  const quoteNumber = `DEV-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: quote, error: quoteError } = await supabase.from("quotes").insert({
    cooperative_id: cooperativeId, created_by: session.userId, quote_number: quoteNumber,
    client_id: parsed.data.clientId || null, project_id: parsed.data.projectId || null,
    subtotal, discount: discountAmount, tax_rate: parsed.data.taxRate, total,
    valid_until: parsed.data.validUntil || null, status: "draft",
  }).select("id").single();
  if (quoteError || !quote) return { status: "error", message: "Le devis n’a pas pu être créé." };
  const { error: itemError } = await supabase.from("quote_items").insert(items.map((item, index) => ({ quote_id: quote.id, ...item, position: index + 1 })));
  if (itemError) {
    await supabase.from("quotes").delete().eq("id", quote.id);
    return { status: "error", message: "Les lignes du devis n’ont pas pu être enregistrées." };
  }
  await logAudit(session.userId, "quote.created", "quote", quote.id, { quote_number: quoteNumber, total });
  revalidatePath("/pricing");
  return { status: "success", message: `${quoteNumber} créé en brouillon — ${total.toLocaleString("fr-MA")} MAD.` };
}
