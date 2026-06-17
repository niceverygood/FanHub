import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const DAY_MS = 86_400_000;

export interface ChartRow {
  handle: string;
  displayName: string;
  volume7d: number;
  rank: number;
  prevRank: number | null;
  /** prevRank - rank: positive = moved up (▲), negative = down (▼), null = NEW. */
  delta: number | null;
  /** 7 daily volume buckets, oldest → newest. */
  spark: number[];
}

/**
 * 7-day creator volume ranking, cached in Next's in-region data cache for 5
 * minutes (revalidate). Avoids cross-region Redis on the hot path.
 */
const getCachedChart = unstable_cache(async () => computeChart(), ["chart-7d"], {
  revalidate: 300,
});

export async function get7dChart(): Promise<ChartRow[]> {
  return getCachedChart();
}

interface Agg {
  handle: string;
  displayName: string;
  cur: number;
  prev: number;
  spark: number[];
}

async function computeChart(): Promise<ChartRow[]> {
  const now = Date.now();
  const since = new Date(now - 14 * DAY_MS);

  const orders = await prisma.order.findMany({
    where: { status: "PAID", updatedAt: { gte: since } },
    select: {
      amountKrw: true,
      updatedAt: true,
      content: { select: { creator: { select: { id: true, handle: true, displayName: true } } } },
    },
  });

  const map = new Map<string, Agg>();
  for (const o of orders) {
    const creator = o.content?.creator;
    if (!creator) continue;
    const ageDays = Math.floor((now - o.updatedAt.getTime()) / DAY_MS);
    let agg = map.get(creator.id);
    if (!agg) {
      agg = { handle: creator.handle, displayName: creator.displayName, cur: 0, prev: 0, spark: new Array(7).fill(0) };
      map.set(creator.id, agg);
    }
    if (ageDays < 7) {
      agg.cur += o.amountKrw;
      const idx = 6 - ageDays; // today → rightmost
      if (idx >= 0 && idx < 7) agg.spark[idx] = (agg.spark[idx] ?? 0) + o.amountKrw;
    } else if (ageDays < 14) {
      agg.prev += o.amountKrw;
    }
  }

  const all = [...map.values()];
  const prevRankByHandle = new Map<string, number>();
  [...all]
    .filter((a) => a.prev > 0)
    .sort((x, y) => y.prev - x.prev)
    .forEach((a, i) => prevRankByHandle.set(a.handle, i + 1));

  return [...all]
    .filter((a) => a.cur > 0)
    .sort((x, y) => y.cur - x.cur)
    .map((a, i) => {
      const rank = i + 1;
      const prevRank = prevRankByHandle.get(a.handle) ?? null;
      return {
        handle: a.handle,
        displayName: a.displayName,
        volume7d: a.cur,
        rank,
        prevRank,
        delta: prevRank === null ? null : prevRank - rank,
        spark: a.spark,
      };
    });
}
