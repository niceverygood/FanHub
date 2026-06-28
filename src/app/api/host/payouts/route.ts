import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireHost } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { requestPayout } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({ amountKrw: z.number().int().positive() });

/** A host requests a payout of their accrued commission balance. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const { user, profile } = await requireHost();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const payout = await requestPayout({ type: "HOST", id: profile.id }, body.data.amountKrw);
    await prisma.auditLog.create({
      data: { actorId: user.id, action: "payout_requested", targetType: "Payout", targetId: payout.id, meta: { amountKrw: payout.amountKrw, host: true } },
    });
    return NextResponse.json({ id: payout.id, amountKrw: payout.amountKrw, status: payout.status });
  } catch (e) {
    return errorResponse(e);
  }
}
