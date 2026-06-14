import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  decision: z.enum(["RESOLVE", "DISMISS"]),
  delist: z.boolean().optional(),
});

/** Admin resolves/dismisses a report, optionally delisting the content. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const report = await prisma.report.findUnique({ where: { id: params.id } });
    if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const next = body.data.decision === "RESOLVE" ? "RESOLVED" : "DISMISSED";

    await prisma.$transaction(async (tx) => {
      await tx.report.updateMany({
        where: { id: params.id, status: "OPEN" },
        data: { status: next, resolvedAt: new Date() },
      });
      if (body.data.delist) {
        await tx.content.updateMany({
          where: { id: report.contentId, status: "PUBLISHED" },
          data: { status: "DELISTED" },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: `report_${next.toLowerCase()}`,
          targetType: "Report",
          targetId: params.id,
          meta: { contentId: report.contentId, delisted: Boolean(body.data.delist) },
        },
      });
    });

    return NextResponse.json({ ok: true, status: next });
  } catch (e) {
    return errorResponse(e);
  }
}
