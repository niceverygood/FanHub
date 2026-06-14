import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AGE_COOKIE = "fh_age_verified";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Sets the age-verification cookie and redirects back to the originally
 * requested path. Only same-site relative paths are honored (open-redirect
 * guard).
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const nextRaw = form.get("next");
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/";

  // 303 forces the follow-up request to be a GET.
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(AGE_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return res;
}
