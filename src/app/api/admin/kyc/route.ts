import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  creatorId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
});

/** Admin approves/rejects a creator's KYC. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const next = body.data.decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const updated = await prisma.creatorProfile.updateMany({
      where: { id: body.data.creatorId, kycStatus: "PENDING" },
      data: { kycStatus: next },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "not_pending" }, { status: 409 });
    }
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: `kyc_${next.toLowerCase()}`, targetType: "CreatorProfile", targetId: body.data.creatorId, meta: {} },
    });
    return NextResponse.json({ ok: true, status: next });
  } catch (e) {
    return errorResponse(e);
  }
}
