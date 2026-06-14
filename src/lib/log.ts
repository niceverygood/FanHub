/**
 * Logging helpers that mask PII / payment payloads. Never log raw webhook
 * bodies, card data, emails, or secrets in full.
 */

const SENSITIVE_KEYS = [
  "password",
  "passwordHash",
  "token",
  "secret",
  "authorization",
  "card",
  "cardNumber",
  "cvv",
  "salt",
  "access_token",
  "refresh_token",
  "id_token",
];

/** Masks an email like "alice@example.com" -> "a***@example.com". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

/** Returns a shallow-masked copy of an object safe to log. */
export function maskObject(input: unknown): unknown {
  if (input === null || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(maskObject);

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((k) => lower.includes(k.toLowerCase()))) {
      out[key] = "***";
    } else if (lower === "email" && typeof value === "string") {
      out[key] = maskEmail(value);
    } else if (typeof value === "object") {
      out[key] = maskObject(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
