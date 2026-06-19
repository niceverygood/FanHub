import { NextResponse } from "next/server";
import { getRecentTrades } from "@/lib/ticker";

export const runtime = "nodejs";

export async function GET() {
  const trades = await getRecentTrades(20);
  // Public, non-personalized data → let the Vercel edge serve it. Most of the
  // client's 10s polls hit the edge cache instead of invoking the function/DB.
  return NextResponse.json(
    { trades },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } },
  );
}
