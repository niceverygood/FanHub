import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

const KEY = "ticker:recent";
const MAX = 50;

export interface Trade {
  id: string;
  handle: string;
  title: string;
  amountKrw: number;
  at: string;
}

/**
 * Best-effort: record a PAID order on the live-trade ticker. Called from the
 * webhook route boundary (NOT the payment service) so payment correctness never
 * depends on Redis being up.
 */
export async function pushTradeForPaidOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { content: { include: { creator: true } } },
    });
    if (!order?.content) return;
    const trade: Trade = {
      id: order.id,
      handle: order.content.creator.handle,
      title: order.content.title,
      amountKrw: order.amountKrw,
      at: new Date().toISOString(),
    };
    await redis.lpush(KEY, JSON.stringify(trade));
    await redis.ltrim(KEY, 0, MAX - 1);
    await redis.publish("ticker", JSON.stringify(trade));
  } catch {
    // Ticker is non-critical; swallow.
  }
}

/** Recent trades from Redis; falls back to the DB if the cache is cold. */
export async function getRecentTrades(limit = 20): Promise<Trade[]> {
  try {
    const raw = await redis.lrange(KEY, 0, limit - 1);
    if (raw.length > 0) {
      return raw.map((r) => JSON.parse(r) as Trade);
    }
  } catch {
    // fall through to DB
  }
  const orders = await prisma.order.findMany({
    where: { status: "PAID" },
    orderBy: { updatedAt: "desc" },
    take: limit,
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
}
