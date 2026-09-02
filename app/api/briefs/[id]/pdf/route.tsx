import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getBriefById } from "@/lib/briefs";
import { getProjectById } from "@/lib/projects";
import { BriefPdfDocument } from "@/lib/briefs/pdf";
import { getEmployeeSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const productionLabels: Record<string, string> = {
  event: "Événementiel",
  corporate: "Corporate",
  livestream: "Live streaming",
  postproduction: "Post-production",
  drone: "Drone",
  studio: "Studio",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getEmployeeSession();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (!(await hasPermission(session.userId, "documents.download"))) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const { id } = await params;

  const briefResult = await getBriefById(id);
  if (!briefResult.ok) {
    if (briefResult.reason === "unauthenticated") return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    return NextResponse.json({ error: "Fiche technique introuvable." }, { status: 404 });
  }

  const brief = briefResult.brief;
  const project = await getProjectById(brief.project_id, session.profile.cooperative_id);
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  }

  try {
    const buffer = await renderToBuffer(
      <BriefPdfDocument
        brief={brief}
        projectCode={project.code}
        productionTypeLabel={productionLabels[project.production_type] ?? project.production_type}
      />,
    );

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `inline; filename="${encodeFilename(brief.title)}.pdf"`);

    return new NextResponse(new Uint8Array(buffer), { headers });
  } catch (error) {
    console.error("PDF generation failed", error);
    return NextResponse.json({ error: "Impossible de générer le PDF." }, { status: 500 });
  }
}

function encodeFilename(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 80);
}
