import { describe, it, expect, afterEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/payments/orders";
import { processPaid } from "@/lib/payments/webhook";
import type { NormalizedPaymentEvent } from "@/lib/payments/provider";
import { notify, unreadCount, markRead, listNotifications } from "@/lib/notifications";
import { createBuyer, createCreatorContent, createHost, cleanupTestData } from "./helpers/factory";

const paidEvent = (orderId: string): NormalizedPaymentEvent => ({
  eventId: `test-evt-${orderId}`, type: "PAID", orderId, providerRef: `mock_${orderId}`,
});

afterEach(async () => {
  await cleanupTestData();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("notifications", () => {
  it("notify → unread count → mark read", async () => {
    const u = await createBuyer();
    await notify({ userId: u.id, type: "test", title: "안녕", body: "본문" });
    await notify({ userId: u.id, type: "test", title: "둘째" });

    expect(await unreadCount(u.id)).toBe(2);
    const cleared = await markRead(u.id, { all: true });
    expect(cleared).toBe(2);
    expect(await unreadCount(u.id)).toBe(0);
  });

  it("a sale notifies the creator, and the host when referred", async () => {
    const { hostProfileId } = await createHost();
    const { creatorProfileId, contentId } = await createCreatorContent({ priceKrw: 10000, hostId: hostProfileId });
    const [cp, hp] = await Promise.all([
      prisma.creatorProfile.findUnique({ where: { id: creatorProfileId }, select: { userId: true } }),
      prisma.hostProfile.findUnique({ where: { id: hostProfileId }, select: { userId: true } }),
    ]);

    const buyer = await createBuyer();
    const order = await createOrder({ buyerId: buyer.id, contentId, idempotencyKey: `test-idem-${randomUUID()}` });
    await processPaid(paidEvent(order.id));

    const creatorNotes = await listNotifications(cp!.userId);
    const hostNotes = await listNotifications(hp!.userId);
    expect(creatorNotes.some((n) => n.type === "sale")).toBe(true);
    expect(hostNotes.some((n) => n.type === "host_commission")).toBe(true);
  });

  it("non-referred sale does not create a host_commission notification", async () => {
    const { creatorProfileId, contentId } = await createCreatorContent({ priceKrw: 10000 });
    const cp = await prisma.creatorProfile.findUnique({ where: { id: creatorProfileId }, select: { userId: true } });
    const buyer = await createBuyer();
    const order = await createOrder({ buyerId: buyer.id, contentId, idempotencyKey: `test-idem-${randomUUID()}` });
    await processPaid(paidEvent(order.id));

    const notes = await listNotifications(cp!.userId);
    expect(notes.some((n) => n.type === "sale")).toBe(true);
    expect(notes.some((n) => n.type === "host_commission")).toBe(false);
  });
});
