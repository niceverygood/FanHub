import { NextResponse, type NextRequest } from "next/server";
import { captureOrder } from "@/lib/payments/paypal";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PayPal redirects the buyer here after they approve the order (?token=<orderId>).
 * We capture it — the resulting PAYMENT.CAPTURE.COMPLETED webhook is the
 * authoritative confirmation that marks our order PAID — then send the buyer to
 * their library.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token"); // PayPal order id
  if (token) {
    try {
      await captureOrder(token);
    } catch {
      // Already captured (webhook) or transient — the webhook remains the truth.
    }
  }
  return NextResponse.redirect(`${env.AUTH_URL}/library`);
}
