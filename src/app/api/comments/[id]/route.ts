import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/http";
import { requireUser } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Deletes a comment. Allowed for the author, the content's creator, or an admin. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const user = await requireUser();

    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, content: { select: { creator: { select: { userId: true } } } } },
    });
    if (!comment) return NextResponse.json({ error: "comment_not_found" }, { status: 404 });

    const allowed =
      comment.userId === user.id ||
      comment.content.creator.userId === user.id ||
      user.role === "ADMIN";
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    await prisma.comment.delete({ where: { id: comment.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
