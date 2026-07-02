import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin, clientIp } from "@/lib/http";
import { requireUser } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Toggles the caller's like on a content item. Returns the new state. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const user = await requireUser();

    const rl = await rateLimit(`like:${user.id}:${clientIp(req)}`, 60, 60);
    if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const content = await prisma.content.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!content || content.status === "DRAFT") {
      return NextResponse.json({ error: "content_not_found" }, { status: 404 });
    }

    // Toggle: delete if present, else create. The unique constraint on
    // (userId, contentId) makes concurrent toggles collapse to one row.
    const deleted = await prisma.like.deleteMany({
      where: { userId: user.id, contentId: content.id },
    });
    let liked = false;
    if (deleted.count === 0) {
      try {
        await prisma.like.create({ data: { userId: user.id, contentId: content.id } });
        liked = true;
      } catch (e) {
        // P2002: a concurrent request already created it — treat as liked.
        if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
          liked = true;
        } else {
          throw e;
        }
      }
    }

    const count = await prisma.like.count({ where: { contentId: content.id } });
    return NextResponse.json({ liked, count });
  } catch (e) {
    return errorResponse(e);
  }
}
