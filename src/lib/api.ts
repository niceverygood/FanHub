import { NextResponse } from "next/server";
import { AuthzError } from "@/lib/authz";
import { UploadError } from "@/lib/studio/uploads";
import { PayoutError } from "@/lib/payouts";

/** Maps known domain errors to JSON responses; rethrows the unexpected. */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof AuthzError) {
    return NextResponse.json({ error: e.code }, { status: e.status });
  }
  if (e instanceof UploadError) {
    return NextResponse.json({ error: e.code }, { status: 400 });
  }
  if (e instanceof PayoutError) {
    const status = e.code === "insufficient_balance" ? 409 : 400;
    return NextResponse.json({ error: e.code }, { status });
  }
  throw e;
}
