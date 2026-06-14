import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireCreator } from "@/lib/authz";
import { createUploadUrl } from "@/lib/studio/uploads";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(["preview", "original"]),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const { profile } = await requireCreator();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const upload = await createUploadUrl({ creatorId: profile.id, ...body.data });
    return NextResponse.json(upload);
  } catch (e) {
    return errorResponse(e);
  }
}
