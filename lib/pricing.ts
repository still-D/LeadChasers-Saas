import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type ServiceItem = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  unit: string;
  base_price: number;
  currency: "MAD" | "EUR" | "USD";
};

export type QuoteSummary = {
  id: string;
  quote_number: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  total: number;
  valid_until: string | null;
  created_at: string;
  client: { id: string; name: string; company: string | null } | null;
  project: { id: string; title: string; code: string } | null;
};

export async function listServiceCatalog(cooperativeId: string): Promise<ServiceItem[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("service_catalog")
    .select("id, category, name, description, unit, base_price, currency")
    .eq("cooperative_id", cooperativeId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as ServiceItem[];
}

export async function listQuotes(cooperativeId: string): Promise<QuoteSummary[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("quotes")
    .select("id, quote_number, status, total, valid_until, created_at, clients:client_id(id, name, company), projects:project_id(id, title, code)")
    .eq("cooperative_id", cooperativeId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    quote_number: row.quote_number,
    status: row.status as QuoteSummary["status"],
    total: Number(row.total),
    valid_until: row.valid_until,
    created_at: row.created_at,
    client: (Array.isArray(row.clients) ? row.clients[0] : row.clients) ?? null,
    project: (Array.isArray(row.projects) ? row.projects[0] : row.projects) ?? null,
  }));
}
