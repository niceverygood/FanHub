import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface Trade {
  id: string;
  handle: string;
  title: string;
  amountKrw: number;
  at: string;
}

/**
 * No-op: the ticker reads recent PAID orders directly from the (in-region) DB,
 * so there's nothing to push. Kept for the webhook/dev-pay callers. Redis was
 * removed from the hot path because the Upstash instance lives in a different
 * region than the functions, which added cross-region latency.
 */
export async function pushTradeForPaidOrder(_orderId: string): Promise<void> {
  // intentionally empty
}

/** Recent PAID trades from the in-region DB, cached briefly (Next data cache). */
const fetchRecentTrades = unstable_cache(
  async (): Promise<Trade[]> => {
    const orders = await prisma.order.findMany({
      where: { status: "PAID" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { content: { include: { creator: true } } },
    });
    return orders
      .filter((o) => o.content)
      .map((o) => ({
        id: o.id,
        handle: o.content!.creator.handle,
        title: o.content!.title,
        amountKrw: o.amountKrw,
        at: o.updatedAt.toISOString(),
      }));
  },
  ["recent-trades"],
  { revalidate: 20 },
);

export async function getRecentTrades(limit = 20): Promise<Trade[]> {
  const all = await fetchRecentTrades();
  return all.slice(0, limit);
}
