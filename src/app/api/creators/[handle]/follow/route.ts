import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin, clientIp } from "@/lib/http";
import { requireUser } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { notify } from "@/lib/notifications";
import { fanDisplayName } from "@/lib/social";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Toggles the caller's follow on a creator. Returns the new state. */
export async function POST(req: NextRequest, { params }: { params: { handle: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const user = await requireUser();

    const rl = await rateLimit(`follow:${user.id}:${clientIp(req)}`, 30, 60);
    if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const creator = await prisma.creatorProfile.findUnique({
      where: { handle: params.handle },
      select: { id: true, userId: true, handle: true },
    });
    if (!creator) return NextResponse.json({ error: "creator_not_found" }, { status: 404 });
    if (creator.userId === user.id) {
      return NextResponse.json({ error: "cannot_follow_self" }, { status: 400 });
    }

    const deleted = await prisma.follow.deleteMany({
      where: { userId: user.id, creatorId: creator.id },
    });
    let following = false;
    if (deleted.count === 0) {
      try {
        await prisma.follow.create({ data: { userId: user.id, creatorId: creator.id } });
        following = true;
        const me = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, name: true },
        });
        if (me) {
          await notify({
            userId: creator.userId,
            type: "follow",
            title: "새 팔로워",
            body: `${fanDisplayName(me)}님이 팔로우하기 시작했습니다.`,
            link: `/c/${creator.handle}`,
          });
        }
      } catch (e) {
        if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
          following = true;
        } else {
          throw e;
        }
      }
    }

    const count = await prisma.follow.count({ where: { creatorId: creator.id } });
    return NextResponse.json({ following, count });
  } catch (e) {
    return errorResponse(e);
  }
}
