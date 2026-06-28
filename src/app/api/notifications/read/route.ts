import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/http";
import { requireUser } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { markRead } from "@/lib/notifications";

export const runtime = "nodejs";

const schema = z.object({
  all: z.boolean().optional(),
  ids: z.array(z.string()).optional(),
});

/** Marks the current user's notifications read ({all:true} or specific ids). */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const user = await requireUser();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    const count = await markRead(user.id, { all: body.data.all, ids: body.data.ids });
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return errorResponse(e);
  }
}
