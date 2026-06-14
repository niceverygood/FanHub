import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isSameOrigin, clientIp } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";
import { createOrder, OrderError } from "@/lib/payments/orders";
import { getPaymentProvider } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Client sends ONLY ids. No amount field — and any extra keys are stripped, so
// a tampered amount is structurally impossible to honor.
const bodySchema = z.object({
  contentId: z.string().min(1),
  dropId: z.string().min(1).optional(),
});

const ORDER_ERROR_STATUS: Record<string, number> = {
  content_not_found: 404,
  content_not_purchasable: 409,
  drop_invalid: 400,
  drop_not_live: 409,
};

export async function POST(req: NextRequest) {
  // CSRF: same-origin required (webhooks are the only signature-based exception).
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.user.ageVerified) {
    return NextResponse.json({ error: "age_verification_required" }, { status: 403 });
  }

  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!idempotencyKey) {
    return NextResponse.json({ error: "idempotency_key_required" }, { status: 400 });
  }

  // Rate limit per user + IP.
  const rl = await rateLimit(`orders:${session.user.id}:${clientIp(req)}`, 20, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const order = await createOrder({
      buyerId: session.user.id,
      contentId: parsed.data.contentId,
      dropId: parsed.data.dropId,
      idempotencyKey,
    });

    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      orderId: order.id,
      amountKrw: order.amountKrw,
      buyerId: session.user.id,
    });

    if (order.providerRef !== checkout.providerRef) {
      await prisma.order.update({
        where: { id: order.id },
        data: { providerRef: checkout.providerRef },
      });
    }

    return NextResponse.json({
      orderId: order.id,
      amountKrw: order.amountKrw, // server-derived amount, echoed for display
      redirectUrl: checkout.redirectUrl,
    });
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json(
        { error: e.code },
        { status: ORDER_ERROR_STATUS[e.code] ?? 400 },
      );
    }
    throw e;
  }
}
