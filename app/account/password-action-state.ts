export type PasswordChangeActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<"currentPassword" | "password" | "confirmation", string>>;
};

export const initialPasswordChangeActionState: PasswordChangeActionState = { status: "idle" };
