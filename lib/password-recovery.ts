import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const PASSWORD_RECOVERY_COOKIE = "lc_password_recovery";
const TOKEN_LIFETIME_SECONDS = 10 * 60;

function getSigningSecret() {
  return process.env.PASSWORD_RECOVERY_SECRET
    ?? process.env.AUTH_RATE_LIMIT_PEPPER
    ?? process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? null;
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createPasswordRecoveryToken(userId: string) {
  const secret = getSigningSecret();
  if (!secret) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyPasswordRecoveryToken(token: string | undefined, userId: string) {
  const secret = getSigningSecret();
  if (!secret || !token) return false;
  const [tokenUserId, rawExpiry, suppliedSignature] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (tokenUserId !== userId || !Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000) || !suppliedSignature) {
    return false;
  }

  const payload = `${tokenUserId}.${expiresAt}`;
  const expected = Buffer.from(signature(payload, secret));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export const passwordRecoveryCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: TOKEN_LIFETIME_SECONDS,
  path: "/update-password",
};
