import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { entitlementFor, signedGetUrl, assetKeysOf, SIGNED_URL_TTL_SECONDS } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issues short-lived signed GET URLs for a content's original assets — ONLY to
 * a holder of a non-revoked Entitlement. The entitlement check is in the query
 * (buyerId pinned to the session user), so it is IDOR-safe.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const entitlement = await entitlementFor(session.user.id, params.id);
  if (!entitlement) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const content = await prisma.content.findUnique({ where: { id: params.id } });
  if (!content) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const keys = assetKeysOf(content.assetKeys);
  const urls = await Promise.all(keys.map((key) => signedGetUrl(key)));

  return NextResponse.json({
    contentId: content.id,
    watermarkId: entitlement.watermarkId,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    urls,
  });
}
