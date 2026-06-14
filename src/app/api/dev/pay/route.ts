import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { auth } from "@/auth";
import { signMockPayload } from "@/lib/payments/mock";
import { verifyAndProcess } from "@/lib/payments/webhook";
import { pushTradeForPaidOrder } from "@/lib/ticker";
import type { NormalizedPaymentEvent } from "@/lib/payments/provider";

export const runtime = "nodejs";

/**
 * Mock-provider checkout simulator. Stands in for the PSP posting a signed
 * webhook. Enabled only while the Mock provider is active; disabled once a real
 * PSP is configured. Safety: requires a session and that the order belongs to
 * the caller, so no one can mark someone else's order paid.
 */
const schema = z.object({
  orderId: z.string().min(1),
  outcome: z.enum(["PAID", "FAILED", "REFUNDED"]),
});

export async function POST(req: NextRequest) {
  if (env.PAYMENT_PROVIDER !== "mock") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const parsed = schema.safeParse({
    orderId: form.get("orderId"),
    outcome: form.get("outcome"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }
  // Ownership: only the buyer can complete their own order.
  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const event: NormalizedPaymentEvent = {
    eventId: `dev-${order.id}-${parsed.data.outcome}`,
    type: parsed.data.outcome,
    orderId: order.id,
    providerRef: order.providerRef ?? `mock_${order.id}`,
    amountKrw: order.amountKrw,
  };

  const rawBody = Buffer.from(JSON.stringify(event), "utf8");
  const signature = signMockPayload(rawBody);
  const result = await verifyAndProcess(rawBody, { "x-mock-signature": signature });

  if (result.body.outcome === "paid" && typeof result.body.orderId === "string") {
    await pushTradeForPaidOrder(result.body.orderId);
  }

  // Back to the content page — shows the unlocked viewer once PAID.
  return NextResponse.redirect(new URL(`/content/${order.contentId}`, req.url), 303);
}
