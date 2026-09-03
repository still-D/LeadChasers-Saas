import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type RateLimitRule = {
  scope: string;
  identifier: string;
  maxAttempts: number;
  windowSeconds: number;
  blockSeconds: number;
};

function getRateLimitPepper() {
  return process.env.AUTH_RATE_LIMIT_PEPPER
    ?? process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? null;
}

function hashIdentifier(scope: string, identifier: string) {
  const pepper = getRateLimitPepper();
  if (!pepper) return null;
  return createHmac("sha256", pepper).update(`${scope}:${identifier}`).digest("hex");
}

function normalizeClientAddress(value: string | null) {
  const candidate = value?.split(",")[0]?.trim() ?? "unknown";
  return /^[a-fA-F0-9:.]{3,64}$/.test(candidate) ? candidate.toLowerCase() : "unknown";
}

async function getClientAddress() {
  const requestHeaders = await headers();
  return normalizeClientAddress(
    requestHeaders.get("cf-connecting-ip")
      ?? requestHeaders.get("x-real-ip")
      ?? requestHeaders.get("x-forwarded-for"),
  );
}

async function consumeRule(rule: RateLimitRule): Promise<RateLimitDecision> {
  const identifierHash = hashIdentifier(rule.scope, rule.identifier);
  const supabase = createSupabaseServiceClient();
  if (!identifierHash || !supabase) {
    return { allowed: process.env.NODE_ENV !== "production", retryAfterSeconds: 60 };
  }

  const { data, error } = await supabase.rpc("consume_security_rate_limit", {
    p_scope: rule.scope,
    p_identifier_hash: identifierHash,
    p_max_attempts: rule.maxAttempts,
    p_window_seconds: rule.windowSeconds,
    p_block_seconds: rule.blockSeconds,
  });

  if (error) {
    console.error("Security rate limiter unavailable", { scope: rule.scope, code: error.code });
    return { allowed: process.env.NODE_ENV !== "production", retryAfterSeconds: 60 };
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    allowed: result?.allowed === true,
    retryAfterSeconds: Math.max(0, Number(result?.retry_after_seconds ?? 0)),
  };
}

export async function consumeLoginRateLimit(normalizedEmail: string): Promise<RateLimitDecision> {
  const clientAddress = await getClientAddress();
  const [account, network] = await Promise.all([
    consumeRule({ scope: "login-account", identifier: normalizedEmail, maxAttempts: 7, windowSeconds: 900, blockSeconds: 1800 }),
    consumeRule({ scope: "login-network", identifier: clientAddress, maxAttempts: 30, windowSeconds: 900, blockSeconds: 1800 }),
  ]);

  return {
    allowed: account.allowed && network.allowed,
    retryAfterSeconds: Math.max(account.retryAfterSeconds, network.retryAfterSeconds),
  };
}

export async function clearLoginAccountRateLimit(normalizedEmail: string) {
  const identifierHash = hashIdentifier("login-account", normalizedEmail);
  const supabase = createSupabaseServiceClient();
  if (!identifierHash || !supabase) return;
  const { error } = await supabase.rpc("clear_security_rate_limit", {
    p_scope: "login-account",
    p_identifier_hash: identifierHash,
  });
  if (error) console.error("Failed to clear login rate limit", { code: error.code });
}

export async function consumePasswordResetRateLimit(normalizedEmail: string): Promise<RateLimitDecision> {
  const clientAddress = await getClientAddress();
  const [account, network] = await Promise.all([
    consumeRule({ scope: "password-reset-account", identifier: normalizedEmail, maxAttempts: 3, windowSeconds: 3600, blockSeconds: 3600 }),
    consumeRule({ scope: "password-reset-network", identifier: clientAddress, maxAttempts: 10, windowSeconds: 3600, blockSeconds: 3600 }),
  ]);

  return {
    allowed: account.allowed && network.allowed,
    retryAfterSeconds: Math.max(account.retryAfterSeconds, network.retryAfterSeconds),
  };
}
