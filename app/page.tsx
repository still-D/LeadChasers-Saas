import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/auth";

export default async function Home() {
  const session = await getEmployeeSession();
  redirect(session ? "/dashboard" : "/login");
}
