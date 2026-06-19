import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Live drop stock, for client-side polling. Optional ?ids=a,b filters to
 * specific drops; otherwise returns LIVE + SCHEDULED drops. Only stock/status
 * fields are exposed.
 */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;

  const drops = await prisma.drop.findMany({
    where: ids ? { id: { in: ids } } : { status: { in: ["LIVE", "SCHEDULED"] } },
    select: {
      id: true,
      remaining: true,
      totalSupply: true,
      status: true,
      startsAt: true,
      endsAt: true,
    },
  });

  // Short edge cache: stock display can be a few seconds stale (the purchase
  // path re-checks stock with a conditional UPDATE, so this never oversells).
  return NextResponse.json(
    { drops },
    { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" } },
  );
}
