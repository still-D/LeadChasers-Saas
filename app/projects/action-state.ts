import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export const projectSchema = z.object({
  title: z.string().trim().min(3, "Le nom doit contenir au moins 3 caractères.").max(120),
  clientId: z.union([z.string().uuid(), z.literal("")]),
  productionType: z.enum(["event", "corporate", "livestream", "postproduction", "drone", "studio"]),
  eventDate: z.string().regex(datePattern, "Date de production invalide."),
  deadline: z.union([z.string().regex(datePattern), z.literal("")]),
  location: z.string().trim().max(160).optional(),
  budget: z.coerce.number().nonnegative().max(99_999_999),
  dealStatus: z.enum(["discovery", "proposal", "negotiation", "won", "lost", "on_hold"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  briefSummary: z.string().trim().max(2000).optional(),
}).refine((data) => !data.deadline || data.deadline >= data.eventDate, {
  path: ["deadline"], message: "La livraison ne peut pas précéder la production.",
});

export type ProjectActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof projectSchema>, string>>;
};
export const initialProjectActionState: ProjectActionState = { status: "idle" };
