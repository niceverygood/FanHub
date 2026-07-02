import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin, clientIp } from "@/lib/http";
import { requireUser } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { notify } from "@/lib/notifications";
import { fanDisplayName } from "@/lib/social";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  body: z.string().trim().min(1).max(500),
});

/** Adds a comment to a published content item. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const user = await requireUser();

    const rl = await rateLimit(`comment:${user.id}:${clientIp(req)}`, 10, 60);
    if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const content = await prisma.content.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, title: true, creator: { select: { userId: true } } },
    });
    if (!content || content.status === "DRAFT") {
      return NextResponse.json({ error: "content_not_found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: { contentId: content.id, userId: user.id, body: parsed.data.body },
      include: { user: { select: { id: true, name: true } } },
    });

    if (content.creator.userId !== user.id) {
      await notify({
        userId: content.creator.userId,
        type: "comment",
        title: "새 댓글",
        body: `${fanDisplayName(comment.user)}: ${parsed.data.body.slice(0, 80)}`,
        link: `/content/${content.id}#comments`,
      });
    }

    return NextResponse.json({ id: comment.id });
  } catch (e) {
    return errorResponse(e);
  }
}
