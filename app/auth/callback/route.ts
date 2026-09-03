import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMemberProfile } from "@/lib/permissions";
import { createPasswordRecoveryToken, PASSWORD_RECOVERY_COOKIE, passwordRecoveryCookieOptions } from "@/lib/password-recovery";
import { isMatchingCompanyIdentity, safeInternalPath } from "@/lib/security";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"), "/update-password");
  const supabase = await createSupabaseServerClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=invalid_link", url.origin));

  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await getMemberProfile(user.id) : null;
  if (
    !user?.email
    || !profile
    || !isMatchingCompanyIdentity(user.email, profile.email)
    || !["active", "invited"].includes(profile.status)
    || !profile.role.active
    || !profile.department.active
  ) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=invalid_link", url.origin));
  }

  const response = NextResponse.redirect(new URL(next, url.origin));
  if (next === "/update-password") {
    const recoveryToken = createPasswordRecoveryToken(user.id);
    if (!recoveryToken) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=invalid_link", url.origin));
    }
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, recoveryToken, passwordRecoveryCookieOptions);
  }
  return response;
}
