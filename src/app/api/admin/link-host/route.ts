import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// hostId "" → unlink (creator becomes non-referred, back to the default split).
const schema = z.object({ creatorId: z.string().min(1), hostId: z.string() });

/** Admin links a creator to a referring host (or unlinks with an empty hostId). */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    const { creatorId, hostId } = body.data;

    if (hostId) {
      const host = await prisma.hostProfile.findUnique({ where: { id: hostId }, select: { id: true } });
      if (!host) return NextResponse.json({ error: "host_not_found" }, { status: 404 });
    }
    const updated = await prisma.creatorProfile.updateMany({
      where: { id: creatorId },
      data: { hostId: hostId || null },
    });
    if (updated.count === 0) return NextResponse.json({ error: "creator_not_found" }, { status: 404 });

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: hostId ? "creator_host_linked" : "creator_host_unlinked", targetType: "CreatorProfile", targetId: creatorId, meta: { hostId: hostId || null } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
