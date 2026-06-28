import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { isSameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authz";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  handle: z.string().min(2).max(40).regex(/^[a-z0-9_]+$/, "handle must be lowercase a-z, 0-9, _"),
  displayName: z.string().min(1).max(60),
  password: z.string().min(8),
});

/** Admin creates a HOST account (User role HOST + HostProfile). */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    const { email, handle, displayName, password } = body.data;

    const passwordHash = await bcrypt.hash(password, 10);
    const host = await prisma.hostProfile.create({
      data: {
        handle,
        displayName,
        user: { create: { email, passwordHash, role: "HOST", emailVerified: new Date() } },
      },
    });
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "host_created", targetType: "HostProfile", targetId: host.id, meta: { handle } },
    });
    return NextResponse.json({ id: host.id, handle: host.handle });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String(e.meta?.target ?? "");
      return NextResponse.json({ error: target.includes("email") ? "email_taken" : "handle_taken" }, { status: 409 });
    }
    return errorResponse(e);
  }
}
