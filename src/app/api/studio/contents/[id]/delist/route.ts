import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/http";
import { requireCreator } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Delist own published content. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const { user, profile } = await requireCreator();
    const updated = await prisma.content.updateMany({
      where: { id: params.id, creatorId: profile.id, status: "PUBLISHED" },
      data: { status: "DELISTED" },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await prisma.auditLog.create({
      data: { actorId: user.id, action: "content_delisted", targetType: "Content", targetId: params.id, meta: {} },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
