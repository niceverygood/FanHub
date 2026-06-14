import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signMockPayload } from "@/lib/payments/mock";
import { verifyAndProcess } from "@/lib/payments/webhook";
import { pushTradeForPaidOrder } from "@/lib/ticker";
import type { NormalizedPaymentEvent } from "@/lib/payments/provider";

export const runtime = "nodejs";

// DEV ONLY: simulates the PSP posting a signed webhook. Disabled in production.
const schema = z.object({
  orderId: z.string().min(1),
  outcome: z.enum(["PAID", "FAILED", "REFUNDED"]),
});

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
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

  return NextResponse.json(result.body, { status: result.status });
}
