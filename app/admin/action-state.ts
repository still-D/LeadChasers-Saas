import { z } from "zod";

export const createMemberSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom est requis.").max(80),
  lastName: z.string().trim().min(2, "Le nom est requis.").max(80),
  email: z.string().trim().email("Email invalide.").max(254),
  phone: z.string().trim().max(40).optional(),
  occupation: z.string().trim().max(120).optional(),
  cooperativePosition: z.string().trim().max(120).optional(),
  departmentId: z.string().uuid("Sélectionnez un département."),
  roleId: z.string().uuid("Sélectionnez un rôle."),
});

export type MemberActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof createMemberSchema>, string>>;
};

export const initialMemberActionState: MemberActionState = { status: "idle" };

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  active: z.enum(["true", "false"]).optional(),
});

export type DepartmentActionState = { status: "idle" | "error" | "success"; message?: string };

export const roleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9_-]+$/, "Le slug ne peut contenir que lettres, chiffres, tirets et underscores."),
  description: z.string().trim().max(500).optional(),
});

export type RoleActionState = { status: "idle" | "error" | "success"; message?: string };
