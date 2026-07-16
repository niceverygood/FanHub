import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireCreator } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(1).max(120),
  type: z.enum(["IMAGE_SET", "VIDEO", "BUNDLE"]),
  priceKrw: z.number().int().nonnegative(),
  previewAssetKey: z.string().min(1).optional(),
  assetKeys: z.array(z.string().min(1)).default([]),
  attestation: z.object({
    allParticipantsAdults: z.literal(true),
    consentToDistribute: z.literal(true),
    rightsOwned: z.literal(true),
    noProhibitedContent: z.literal(true),
  }),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const { user, profile } = await requireCreator();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const content = await prisma.content.create({
      data: {
        creatorId: profile.id,
        title: body.data.title,
        type: body.data.type,
        priceKrw: body.data.priceKrw,
        previewAssetKey: body.data.previewAssetKey ?? null,
        assetKeys: body.data.assetKeys,
        status: "DRAFT",
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "content_created",
        targetType: "Content",
        targetId: content.id,
        meta: {
          attestation: body.data.attestation,
          policyVersion: "2026-07-16",
        },
      },
    });
    return NextResponse.json({ id: content.id });
  } catch (e) {
    return errorResponse(e);
  }
}
