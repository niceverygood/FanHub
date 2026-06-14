import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/http";
import { requireCreator } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Creator submits/resubmits KYC: NONE/REJECTED → PENDING. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const { user, profile } = await requireCreator();
    if (profile.kycStatus === "APPROVED") {
      return NextResponse.json({ error: "already_approved" }, { status: 409 });
    }
    if (profile.kycStatus === "PENDING") {
      return NextResponse.json({ error: "already_pending" }, { status: 409 });
    }
    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: { kycStatus: "PENDING" },
    });
    await prisma.auditLog.create({
      data: { actorId: user.id, action: "kyc_submitted", targetType: "CreatorProfile", targetId: profile.id, meta: {} },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
