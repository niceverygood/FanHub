import { describe, it, expect, afterEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/payments/orders";
import {
  handlePaymentEvent,
  refundOrder,
  processPaid,
  verifyAndProcess,
} from "@/lib/payments/webhook";
import type { NormalizedPaymentEvent } from "@/lib/payments/provider";
import { createBuyer, createCreatorContent, cleanupTestData } from "../helpers/factory";

function paidEvent(orderId: string, suffix: string, amountKrw?: number): NormalizedPaymentEvent {
  return {
    eventId: `test-evt-${orderId}-${suffix}`,
    type: "PAID",
    orderId,
    providerRef: `mock_${orderId}`,
    amountKrw,
  };
}

afterEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("payment core", () => {
  it("1) duplicate Idempotency-Key → a single Order", async () => {
    const buyer = await createBuyer();
    const { contentId } = await createCreatorContent({ priceKrw: 12000 });
    const idempotencyKey = `test-idem-${randomUUID()}`;

    const a = await createOrder({ buyerId: buyer.id, contentId, idempotencyKey });
    const b = await createOrder({ buyerId: buyer.id, contentId, idempotencyKey });

    expect(a.id).toBe(b.id);
    expect(await prisma.order.count({ where: { idempotencyKey } })).toBe(1);
  });

  it("2) same webhook eventId twice → 1 Entitlement, no duplicate ledger", async () => {
    const buyer = await createBuyer();
    const { contentId } = await createCreatorContent({ priceKrw: 15000 });
    const order = await createOrder({
      buyerId: buyer.id,
      contentId,
      idempotencyKey: `test-idem-${randomUUID()}`,
    });

    const event = paidEvent(order.id, "dup"); // identical eventId both times
    const first = await handlePaymentEvent(event);
    const second = await handlePaymentEvent(event);

    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);

    expect(await prisma.entitlement.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.ledgerEntry.count({ where: { orderId: order.id } })).toBe(3);
    const reloaded = await prisma.order.findUnique({ where: { id: order.id } });
    expect(reloaded?.status).toBe("PAID");
  });

  it("3) remaining=1 Drop, two concurrent payments → 1 PAID, 1 FAILED+refund", async () => {
    const { contentId, dropId } = await createCreatorContent({
      priceKrw: 20000,
      drop: { supply: 1 },
    });
    const buyer1 = await createBuyer();
    const buyer2 = await createBuyer();

    const order1 = await createOrder({
      buyerId: buyer1.id,
      contentId,
      dropId,
      idempotencyKey: `test-idem-${randomUUID()}`,
    });
    const order2 = await createOrder({
      buyerId: buyer2.id,
      contentId,
      dropId,
      idempotencyKey: `test-idem-${randomUUID()}`,
    });

    // Fire both webhooks concurrently — the conditional UPDATE serializes them.
    await Promise.all([
      handlePaymentEvent(paidEvent(order1.id, "c1")),
      handlePaymentEvent(paidEvent(order2.id, "c2")),
    ]);

    const o1 = await prisma.order.findUnique({ where: { id: order1.id } });
    const o2 = await prisma.order.findUnique({ where: { id: order2.id } });
    const statuses = [o1?.status, o2?.status].sort();
    expect(statuses).toEqual(["FAILED", "PAID"]);

    // Exactly one entitlement across both orders.
    const entitlements = await prisma.entitlement.count({
      where: { orderId: { in: [order1.id, order2.id] } },
    });
    expect(entitlements).toBe(1);

    // Stock fully consumed and never negative.
    const drop = await prisma.drop.findUnique({ where: { id: dropId! } });
    expect(drop?.remaining).toBe(0);
    expect(drop?.status).toBe("SOLD_OUT");

    // The failed order triggered a refund.
    const failedId = o1?.status === "FAILED" ? order1.id : order2.id;
    const refundAudit = await prisma.auditLog.count({
      where: { targetId: failedId, action: "refund_triggered" },
    });
    expect(refundAudit).toBe(1);
    // No purchase ledger for the failed order.
    expect(await prisma.ledgerEntry.count({ where: { orderId: failedId } })).toBe(0);
  });

  it("4) tampered client amount is ignored — server uses DB price", async () => {
    const buyer = await createBuyer();
    const { contentId } = await createCreatorContent({ priceKrw: 15000 });

    // createOrder has no amount param; the amount is always the DB price.
    const order = await createOrder({
      buyerId: buyer.id,
      contentId,
      idempotencyKey: `test-idem-${randomUUID()}`,
    });
    expect(order.amountKrw).toBe(15000);

    // A webhook claiming amount=1 must not change the ledger math.
    await handlePaymentEvent(paidEvent(order.id, "amt", 1));
    const gross = await prisma.ledgerEntry.findFirst({
      where: { orderId: order.id, memo: "purchase_gross" },
    });
    expect(gross?.amountKrw).toBe(15000);
  });

  it("5) bad signature → 401 and no state change", async () => {
    const buyer = await createBuyer();
    const { contentId } = await createCreatorContent({ priceKrw: 9000 });
    const order = await createOrder({
      buyerId: buyer.id,
      contentId,
      idempotencyKey: `test-idem-${randomUUID()}`,
    });

    const event = paidEvent(order.id, "badsig");
    const rawBody = Buffer.from(JSON.stringify(event), "utf8");
    const res = await verifyAndProcess(rawBody, { "x-mock-signature": "deadbeef" });

    expect(res.status).toBe(401);
    const reloaded = await prisma.order.findUnique({ where: { id: order.id } });
    expect(reloaded?.status).toBe("PENDING"); // unchanged
    expect(await prisma.entitlement.count({ where: { orderId: order.id } })).toBe(0);
    expect(await prisma.webhookEvent.count({ where: { eventId: event.eventId } })).toBe(0);
  });

  it("6) refund → reversing ledger + revoked Entitlement (append-only)", async () => {
    const buyer = await createBuyer();
    const { contentId } = await createCreatorContent({ priceKrw: 30000 });
    const order = await createOrder({
      buyerId: buyer.id,
      contentId,
      idempotencyKey: `test-idem-${randomUUID()}`,
    });

    await processPaid(paidEvent(order.id, "pay"));
    expect(await prisma.ledgerEntry.count({ where: { orderId: order.id } })).toBe(3);

    const refundResult = await refundOrder(order.id);
    expect(refundResult.outcome).toBe("refunded");

    const reloaded = await prisma.order.findUnique({ where: { id: order.id } });
    expect(reloaded?.status).toBe("REFUNDED");

    // Original 3 + 3 reversal = 6 (nothing edited/deleted).
    const entries = await prisma.ledgerEntry.findMany({ where: { orderId: order.id } });
    expect(entries).toHaveLength(6);
    expect(entries.filter((e) => e.memo === "refund_reversal")).toHaveLength(3);

    // Net of all entries for this order is zero (credits == debits).
    const credit = entries
      .filter((e) => e.direction === "CREDIT")
      .reduce((s, e) => s + e.amountKrw, 0);
    const debit = entries
      .filter((e) => e.direction === "DEBIT")
      .reduce((s, e) => s + e.amountKrw, 0);
    expect(credit).toBe(debit);

    // Entitlement revoked, not deleted.
    const ent = await prisma.entitlement.findFirst({ where: { orderId: order.id } });
    expect(ent).not.toBeNull();
    expect(ent?.revokedAt).not.toBeNull();
  });
});
