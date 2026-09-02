export const COMPANY_EMAIL_DOMAIN = "leadchasers.ma";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isCompanyEmail(value: string): boolean {
  const email = normalizeEmail(value);
  const parts = email.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1] === COMPANY_EMAIL_DOMAIN;
}

export function isStrongPassword(value: string): boolean {
  return (
    value.length >= 12 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export function safeInternalPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
