import { prisma } from "@/lib/prisma";
import { creatorRevenue } from "@/lib/studio/revenue";

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;

/** YYYY-MM-DD in KST for a given instant. */
function kstDate(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export interface CreatorAnalytics {
  totalSalesCount: number;
  grossKrw: number; // total transacted (buyer-paid) on this creator's content
  earnedKrw: number; // creator's share (from the ledger)
  availableKrw: number;
  avgOrderKrw: number;
  uniqueBuyers: number;
  repeatBuyers: number;
  daily: { date: string; revenue: number; count: number }[]; // last 30 KST days, oldest→newest
  topContent: { contentId: string; title: string; count: number; revenue: number }[];
  drops: { title: string; sold: number; total: number; pct: number; status: string }[];
}

export async function creatorAnalytics(creatorId: string): Promise<CreatorAnalytics> {
  const [orders, drops, revenue] = await Promise.all([
    prisma.order.findMany({
      where: { status: "PAID", content: { creatorId } },
      select: { amountKrw: true, updatedAt: true, contentId: true, buyerId: true, content: { select: { title: true } } },
    }),
    prisma.drop.findMany({
      where: { content: { creatorId } },
      select: { totalSupply: true, remaining: true, status: true, content: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    creatorRevenue(creatorId),
  ]);

  const grossKrw = orders.reduce((s, o) => s + o.amountKrw, 0);
  const totalSalesCount = orders.length;

  // unique / repeat buyers
  const byBuyer = new Map<string, number>();
  for (const o of orders) byBuyer.set(o.buyerId, (byBuyer.get(o.buyerId) ?? 0) + 1);
  const uniqueBuyers = byBuyer.size;
  let repeatBuyers = 0;
  for (const c of byBuyer.values()) if (c > 1) repeatBuyers++;

  // last 30 KST days
  const todayKst = kstDate(new Date());
  const dayKeys: string[] = [];
  for (let i = 29; i >= 0; i--) {
    dayKeys.push(new Date(new Date(todayKst + "T00:00:00Z").getTime() - i * DAY_MS).toISOString().slice(0, 10));
  }
  const dayMap = new Map(dayKeys.map((d) => [d, { revenue: 0, count: 0 }]));
  for (const o of orders) {
    const k = kstDate(o.updatedAt);
    const slot = dayMap.get(k);
    if (slot) {
      slot.revenue += o.amountKrw;
      slot.count += 1;
    }
  }
  const daily = dayKeys.map((d) => ({ date: d, ...dayMap.get(d)! }));

  // top content by revenue
  const byContent = new Map<string, { title: string; count: number; revenue: number }>();
  for (const o of orders) {
    const cur = byContent.get(o.contentId) ?? { title: o.content?.title ?? o.contentId, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += o.amountKrw;
    byContent.set(o.contentId, cur);
  }
  const topContent = [...byContent.entries()]
    .map(([contentId, v]) => ({ contentId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return {
    totalSalesCount,
    grossKrw,
    earnedKrw: revenue.earnedKrw,
    availableKrw: revenue.availableKrw,
    avgOrderKrw: totalSalesCount > 0 ? Math.round(grossKrw / totalSalesCount) : 0,
    uniqueBuyers,
    repeatBuyers,
    daily,
    topContent,
    drops: drops.map((d) => ({
      title: d.content?.title ?? "",
      sold: d.totalSupply - d.remaining,
      total: d.totalSupply,
      pct: d.totalSupply > 0 ? Math.round(((d.totalSupply - d.remaining) / d.totalSupply) * 100) : 0,
      status: d.status,
    })),
  };
}
