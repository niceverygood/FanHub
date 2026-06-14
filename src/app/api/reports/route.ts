import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireUser } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  contentId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

/** Any logged-in user can report a content item. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const user = await requireUser();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const content = await prisma.content.findUnique({ where: { id: body.data.contentId } });
    if (!content) return NextResponse.json({ error: "content_not_found" }, { status: 404 });

    const report = await prisma.report.create({
      data: { contentId: body.data.contentId, reporterId: user.id, reason: body.data.reason },
    });
    return NextResponse.json({ id: report.id });
  } catch (e) {
    return errorResponse(e);
  }
}
