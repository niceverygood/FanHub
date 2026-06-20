import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { disbursePayout } from "@/lib/payouts";

export const runtime = "nodejs";

const schema = z.object({ decision: z.enum(["APPROVE", "PAY", "REJECT"]) });

const NEXT_STATUS = { APPROVE: "APPROVED", PAY: "PAID", REJECT: "REJECTED" } as const;
// Allowed source states for each transition (conditional UPDATE).
const FROM_STATUS = {
  APPROVE: ["REQUESTED"],
  PAY: ["REQUESTED", "APPROVED"],
  REJECT: ["REQUESTED", "APPROVED"],
} as const;

/** Admin advances a payout: REQUESTED → APPROVED → PAID, or → REJECTED. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const next = NEXT_STATUS[body.data.decision];

    if (body.data.decision === "PAY") {
      // Transition + ledger DEBIT atomically (double-payment safe). See disbursePayout.
      const ok = await disbursePayout(params.id);
      if (!ok) return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
    } else {
      const updated = await prisma.payout.updateMany({
        where: { id: params.id, status: { in: [...FROM_STATUS[body.data.decision]] } },
        data: { status: next },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
      }
    }

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: `payout_${next.toLowerCase()}`, targetType: "Payout", targetId: params.id, meta: {} },
    });
    return NextResponse.json({ ok: true, status: next });
  } catch (e) {
    return errorResponse(e);
  }
}
