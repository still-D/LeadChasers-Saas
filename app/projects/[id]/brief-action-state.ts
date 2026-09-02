import { z } from "zod";

export const briefSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(200, "Le titre est trop long."),
  clientName: z.string().trim().max(120, "Le nom du client est trop long."),
  notes: z.string().trim().max(4000, "Les notes ne peuvent pas dépasser 4000 caractères."),
});

export type BriefActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  limitReached?: boolean;
  fieldErrors?: Partial<Record<keyof z.infer<typeof briefSchema>, string>>;
};

export const initialBriefActionState: BriefActionState = { status: "idle" };
