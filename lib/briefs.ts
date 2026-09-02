import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { ProductionType, ProjectDetail } from "./projects";

export type BriefSection = {
  title: string;
  items: string[];
};

export type BriefContent = {
  summary: string;
  sections: BriefSection[];
  equipment: string[];
  crew: string[];
  logistics: string[];
  budgetNotes: string;
};

export type ProjectBrief = {
  id: string;
  project_id: string;
  created_by: string;
  title: string;
  client_name: string | null;
  notes: string | null;
  content: BriefContent;
  created_at: string;
  updated_at: string;
};

export type BriefResult =
  | { ok: true; brief: ProjectBrief }
  | { ok: false; reason: "unauthenticated" | "unauthorized" | "not-found" | "unconfigured" | "duplicate" | "unknown" };

export type BriefListResult =
  | { ok: true; briefs: ProjectBrief[] }
  | { ok: false; reason: "unauthenticated" | "unauthorized" | "unconfigured" };

export async function getProjectBriefs(projectId: string): Promise<BriefListResult> {
  if (!hasSupabaseConfig()) return { ok: false, reason: "unconfigured" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, reason: "unconfigured" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: briefs, error } = await supabase
    .from("project_briefs")
    .select("id, project_id, created_by, title, client_name, notes, content, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    // Authorization failures surface as empty results from RLS; explicit membership check is defensive.
    const { data: membership } = await supabase
      .from("members")
      .select("cooperative_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership) return { ok: false, reason: "unauthorized" };
    return { ok: true, briefs: [] };
  }

  return { ok: true, briefs: (briefs ?? []) as ProjectBrief[] };
}

export async function getBriefById(briefId: string): Promise<BriefResult> {
  if (!hasSupabaseConfig()) return { ok: false, reason: "unconfigured" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, reason: "unconfigured" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: brief, error } = await supabase
    .from("project_briefs")
    .select("id, project_id, created_by, title, client_name, notes, content, created_at, updated_at")
    .eq("id", briefId)
    .single();

  if (error || !brief) return { ok: false, reason: "not-found" };
  return { ok: true, brief: brief as ProjectBrief };
}

export type BriefInput = {
  title: string;
  clientName: string;
  notes: string;
};

export async function createProjectBrief(
  project: ProjectDetail,
  input: BriefInput,
  createdBy: string,
): Promise<BriefResult> {
  if (!hasSupabaseConfig()) return { ok: false, reason: "unconfigured" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, reason: "unconfigured" };

  // Duplicate-submission guard: same user, same project, same title within the last 10 seconds.
  const { data: recent } = await supabase
    .from("project_briefs")
    .select("id")
    .eq("project_id", project.id)
    .eq("created_by", createdBy)
    .eq("title", input.title.trim())
    .gte("created_at", new Date(Date.now() - 10_000).toISOString())
    .limit(1)
    .maybeSingle();
  if (recent) return { ok: false, reason: "duplicate" };

  const content = generateBriefContent(project, input);
  const { data: brief, error } = await supabase
    .from("project_briefs")
    .insert({
      project_id: project.id,
      created_by: createdBy,
      title: input.title.trim(),
      client_name: input.clientName.trim() || null,
      notes: input.notes.trim() || null,
      content,
    })
    .select("id, project_id, created_by, title, client_name, notes, content, created_at, updated_at")
    .single();

  if (error || !brief) return { ok: false, reason: "unknown" };
  return { ok: true, brief: brief as ProjectBrief };
}

export function generateBriefContent(project: ProjectDetail, input: BriefInput): BriefContent {
  const type = project.production_type;
  const baseBudget = Number(project.budget_quoted) || 0;
  const budgetLine = baseBudget > 0
    ? `Budget prévisionnel de ${baseBudget.toLocaleString("fr-MA")} MAD.`
    : "Aucun budget prévisionnel renseigné.";

  const sections: BriefSection[] = [
    {
      title: "Objectif de la production",
      items: [
        `Production de type « ${type} » pour le projet ${project.code}.`,
        `Date retenue : ${new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${project.event_date}T12:00:00`))}.`,
        project.location ? `Lieu de tournage : ${project.location}.` : "Lieu de tournage à confirmer.",
      ],
    },
    {
      title: "Livrables attendus",
      items: deliverablesForType(type),
    },
  ];

  if (input.notes.trim()) {
    sections.push({
      title: "Notes du client / équipe",
      items: input.notes.split(/\n+/).filter((line) => line.trim().length > 0),
    });
  }

  return {
    summary: `Fiche technique générée pour ${project.title} (${project.code}). ${budgetLine}`,
    sections,
    equipment: equipmentForType(type),
    crew: crewForType(type),
    logistics: logisticsForType(type, project.location),
    budgetNotes: budgetLine,
  };
}

function deliverablesForType(type: ProductionType): string[] {
  switch (type) {
    case "event": return ["Captation multi-caméras", "Montage résumé 3-5 min", "Photos de couverture", "Livraison dans les 72h"];
    case "corporate": return ["Interview principale", "Sous-titres bilingues FR/EN", "Version courte réseaux sociaux", "Brand pack graphique"];
    case "livestream": return ["Diffusion en direct multi-plateformes", "Rediffusion archivée", "Monitoring technique sur site", "Backup local de la captation"];
    case "postproduction": return ["Montage offline", "Étalonnage", "Mixage audio", "Export masters broadcast & web"];
    case "drone": return ["Plans aériens 4K", "Autorisation de survol vérifiée", "Raw footage stabilisé", "Clips courts pour réseaux"];
    case "studio": return ["Captation fond vert / décor", "Lighting setup", "Multi-formats de livraison", "Session photo complémentaire"];
    default: return ["Livrables à définir avec le client"];
  }
}

function equipmentForType(type: ProductionType): string[] {
  switch (type) {
    case "event": return ["2 caméras 4K", "Stabilisateur", "Console audio", "Éclairage LED portable"];
    case "corporate": return ["1 caméra 4K", "Éclairage interview", "Micro cravate HF", "Fond neutre"];
    case "livestream": return ["Encodeur streaming", "2 caméras + caméra de secours", "Réseau fibre/4G backup", "Monitoring audio"];
    case "postproduction": return ["Station de montage", "Disques de stockage RAID", "Référence écran étalonné", "Logiciels licenses actives"];
    case "drone": return ["Drone 4K + batteries", "Télécommande backup", "FPV (si besoin)", "Kit filtres ND"];
    case "studio": return ["Caméra studio", "Éclairage 3 points", "Fond / cyclo", "Table de mixage"];
    default: return [];
  }
}

function crewForType(type: ProductionType): string[] {
  switch (type) {
    case "event": return ["Réalisateur / chef de projet", "2 cadreurs", "Ingénieur du son", "Monteur"];
    case "corporate": return ["Réalisateur", "Cadreur", "Ingénieur du son", "Monteur"];
    case "livestream": return ["Chef de projet live", "Régisseur streaming", "Cadreur", "Technicien réseau"];
    case "postproduction": return ["Monteur", "Étalonneur", "Mixeur", "Chef de projet"];
    case "drone": return ["Pilote drone certifié", "Cadreur", "Responsable sécurité", "Monteur"];
    case "studio": return ["Réalisateur", "Cadreur", "Ingénieur lumière", "Maquillage / habillage"];
    default: return [];
  }
}

function logisticsForType(type: ProductionType, location: string | null): string[] {
  const items: string[] = [];
  items.push(location ? `Recce du lieu : ${location}` : "Recce du lieu à planifier");
  items.push("Confirmation des horaires d’accès");
  if (type === "drone") items.push("Autorisations aériennes et météo");
  if (type === "livestream") items.push("Test de bande passante 48h avant");
  if (type === "event") items.push("Plan de salle et angles de caméra");
  items.push("Plan de transport du matériel");
  return items;
}
