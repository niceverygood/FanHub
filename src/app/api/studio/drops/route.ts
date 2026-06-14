import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireCreator } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z
  .object({
    contentId: z.string().min(1),
    totalSupply: z.number().int().positive().max(1_000_000),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), { message: "endsAt must be after startsAt" });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const { user, profile } = await requireCreator();
    if (profile.kycStatus !== "APPROVED") {
      return NextResponse.json({ error: "kyc_required" }, { status: 403 });
    }
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    // Must be the creator's own published content, with no existing drop.
    const content = await prisma.content.findFirst({
      where: { id: body.data.contentId, creatorId: profile.id, status: "PUBLISHED" },
      include: { drop: true },
    });
    if (!content) return NextResponse.json({ error: "content_not_eligible" }, { status: 404 });
    if (content.drop) return NextResponse.json({ error: "drop_exists" }, { status: 409 });

    const startsAt = new Date(body.data.startsAt);
    const status = startsAt.getTime() <= Date.now() ? "LIVE" : "SCHEDULED";

    const drop = await prisma.drop.create({
      data: {
        contentId: content.id,
        totalSupply: body.data.totalSupply,
        remaining: body.data.totalSupply,
        startsAt,
        endsAt: new Date(body.data.endsAt),
        status,
      },
    });
    await prisma.auditLog.create({
      data: { actorId: user.id, action: "drop_created", targetType: "Drop", targetId: drop.id, meta: { totalSupply: drop.totalSupply } },
    });
    return NextResponse.json({ id: drop.id, status });
  } catch (e) {
    return errorResponse(e);
  }
}
