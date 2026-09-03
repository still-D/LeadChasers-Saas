import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function firstConfiguredValue(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? null;
}

function getSupabaseRuntimeConfig() {
  return {
    url: firstConfiguredValue(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL),
    key: firstConfiguredValue(
      process.env.SUPABASE_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

function buildContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  let supabaseOrigin = "";
  let supabaseWebSocketOrigin = "";

  try {
    const parsed = new URL(getSupabaseRuntimeConfig().url ?? "");
    supabaseOrigin = parsed.origin;
    supabaseWebSocketOrigin = `${parsed.protocol === "https:" ? "wss:" : "ws:"}//${parsed.host}`;
  } catch {
    // A missing/invalid URL is handled by the application configuration checks.
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin} ${supabaseWebSocketOrigin}` : ""}${isDevelopment ? " ws: wss:" : ""}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, contentSecurityPolicy: string) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Origin-Agent-Cluster", "?1");
  response.headers.set(
    "Permissions-Policy",
    "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(self), screen-wake-lock=(), serial=(), usb=(), xr-spatial-tracking=(), browsing-topics=()",
  );
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { url, key } = getSupabaseRuntimeConfig();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  let response = applySecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    contentSecurityPolicy,
  );

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, authHeaders) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const [name, value] of Object.entries(authHeaders)) response.headers.set(name, value);
        response = applySecurityHeaders(response, contentSecurityPolicy);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: options.path ?? "/",
          });
        }
      },
    },
  });

  // Refresh an expired session cookie. Authorization remains in the DAL/actions.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
