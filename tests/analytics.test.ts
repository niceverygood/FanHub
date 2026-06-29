import { describe, it, expect, afterEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/payments/orders";
import { processPaid } from "@/lib/payments/webhook";
import { creatorAnalytics } from "@/lib/studio/analytics";
import { createBuyer, createCreatorContent, cleanupTestData } from "./helpers/factory";

async function buy(buyerId: string, contentId: string) {
  const o = await createOrder({ buyerId, contentId, idempotencyKey: `test-idem-${randomUUID()}` });
  await processPaid({ eventId: `test-evt-${o.id}`, type: "PAID", orderId: o.id, providerRef: `mock_${o.id}` });
}

afterEach(async () => {
  await cleanupTestData();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("creator analytics", () => {
  it("aggregates sales, buyers, top content and daily series", async () => {
    const { creatorProfileId, contentId: a } = await createCreatorContent({ priceKrw: 10000 });
    const b = await prisma.content.create({
      data: { creatorId: creatorProfileId, title: "test-B", type: "IMAGE_SET", priceKrw: 30000, status: "PUBLISHED", assetKeys: [] },
    });
    const buyer1 = await createBuyer();
    const buyer2 = await createBuyer();

    await buy(buyer1.id, a); // A 10000
    await buy(buyer1.id, b.id); // B 30000 (buyer1 repeats)
    await buy(buyer2.id, a); // A 10000

    const stats = await creatorAnalytics(creatorProfileId);
    expect(stats.totalSalesCount).toBe(3);
    expect(stats.grossKrw).toBe(50000);
    expect(stats.uniqueBuyers).toBe(2);
    expect(stats.repeatBuyers).toBe(1);
    expect(stats.avgOrderKrw).toBe(Math.round(50000 / 3));
    expect(stats.earnedKrw).toBeGreaterThan(0);

    // top content by revenue: B (30000) before A (20000)
    expect(stats.topContent[0]?.revenue).toBe(30000);
    expect(stats.topContent[1]?.revenue).toBe(20000);

    // all sales landed in today's (last) KST bucket
    expect(stats.daily).toHaveLength(30);
    expect(stats.daily[29]?.count).toBe(3);
    expect(stats.daily[29]?.revenue).toBe(50000);
  });

  it("is empty for a creator with no sales", async () => {
    const { creatorProfileId } = await createCreatorContent({ priceKrw: 10000 });
    const stats = await creatorAnalytics(creatorProfileId);
    expect(stats.totalSalesCount).toBe(0);
    expect(stats.grossKrw).toBe(0);
    expect(stats.avgOrderKrw).toBe(0);
    expect(stats.topContent).toHaveLength(0);
  });
});
