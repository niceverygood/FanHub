import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, isSameOrigin } from "@/lib/http";
import { requireUser } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";

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
    if (!user.ageVerified) return NextResponse.json({ error: "age_verification_required" }, { status: 403 });

    const rl = await rateLimit(`report:${user.id}:${clientIp(req)}`, 10, 60);
    if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const content = await prisma.content.findUnique({ where: { id: body.data.contentId } });
    if (!content) return NextResponse.json({ error: "content_not_found" }, { status: 404 });

    const report = await prisma.report.create({
      data: { contentId: body.data.contentId, reporterId: user.id, reason: body.data.reason },
    });
    await notifyAdmins({ type: "admin_report", title: "새 콘텐츠 신고", body: content.title, link: "/admin" });
    return NextResponse.json({ id: report.id });
  } catch (e) {
    return errorResponse(e);
  }
}
