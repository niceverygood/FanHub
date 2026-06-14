import { NextResponse, type NextRequest } from "next/server";
import { verifyAndProcess } from "@/lib/payments/webhook";
import { pushTradeForPaidOrder } from "@/lib/ticker";

export const runtime = "nodejs";
// Never cache; always read the raw body fresh.
export const dynamic = "force-dynamic";

/**
 * Payment webhook. The ONLY source of truth for payment outcomes — a client
 * success-redirect never grants anything. Signature is verified on the raw body
 * before any parsing; idempotency is keyed on the provider event id.
 */
export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  // Lowercased header map for case-insensitive signature lookup.
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const { status, body } = await verifyAndProcess(rawBody, headers);

  // Live-trade ticker is a presentation concern handled at the boundary, kept
  // off the payment critical path.
  if (body.outcome === "paid" && typeof body.orderId === "string") {
    await pushTradeForPaidOrder(body.orderId);
  }

  return NextResponse.json(body, { status });
}
