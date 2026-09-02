export type LoginActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
};

export const initialLoginActionState: LoginActionState = { status: "idle" };
