import type { NextRequest } from "next/server";

/**
 * Lightweight CSRF defense for state-changing JSON APIs: require the request's
 * Origin (or Referer) to match the Host. Webhooks are exempt (they use
 * signature verification instead). This complements Auth.js's own CSRF token.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) {
    // No Origin header (e.g. same-origin GET-style fetch in some browsers).
    // For mutations we require it; treat absence as untrusted.
    return false;
  }
  try {
    const originHost = new URL(origin).host;
    const host = req.headers.get("host");
    return Boolean(host) && originHost === host;
  } catch {
    return false;
  }
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
