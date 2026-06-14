import { NextResponse } from "next/server";
import { getRecentTrades } from "@/lib/ticker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const trades = await getRecentTrades(20);
  return NextResponse.json({ trades });
}
