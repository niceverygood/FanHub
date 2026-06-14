import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Global 19+ age gate. Until the visitor has confirmed they are an adult
 * (cookie `fh_age_verified=1`, set by /api/age-gate), every page redirects to
 * /age-gate. Auth + webhook APIs and the gate itself are exempt.
 */
const AGE_COOKIE = "fh_age_verified";

const EXEMPT_PREFIXES = [
  "/age-gate",
  "/api/", // auth callbacks, payment webhooks, age-gate submit
  "/preview/", // public blurred preview assets (Phase 3)
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const verified = req.cookies.get(AGE_COOKIE)?.value === "1";
  if (verified) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/age-gate";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
