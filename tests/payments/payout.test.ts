import { describe, it, expect, afterEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/payments/orders";
import { processPaid } from "@/lib/payments/webhook";
import type { NormalizedPaymentEvent } from "@/lib/payments/provider";
import { requestPayout, disbursePayout } from "@/lib/payouts";
import { creatorRevenue } from "@/lib/studio/revenue";
import { createBuyer, createCreatorContent, cleanupTestData } from "../helpers/factory";

function paidEvent(orderId: string, suffix: string): NormalizedPaymentEvent {
  return { eventId: `test-evt-${orderId}-${suffix}`, type: "PAID", orderId, providerRef: `mock_${orderId}` };
}

/** Credits a creator's ledger by simulating a completed purchase. */
async function fundCreator(priceKrw: number): Promise<string> {
  const { creatorProfileId, contentId } = await createCreatorContent({ priceKrw });
  const buyer = await createBuyer();
  const order = await createOrder({
    buyerId: buyer.id,
    contentId,
    idempotencyKey: `test-idem-${randomUUID()}`,
  });
  await processPaid(paidEvent(order.id, "pay"));
  return creatorProfileId;
}

afterEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("payout disbursement", () => {
  it("paying out writes a creator DEBIT; available drops, lifetime earned stays", async () => {
    const creatorId = await fundCreator(10000);

    const rev0 = await creatorRevenue(creatorId);
    expect(rev0.earnedKrw).toBeGreaterThan(0);
    expect(rev0.availableKrw).toBe(rev0.earnedKrw);
    expect(rev0.reservedKrw).toBe(0);
    expect(rev0.paidOutKrw).toBe(0);

    const payAmount = Math.floor(rev0.availableKrw / 2);
    const payout = await requestPayout({ type: "CREATOR", id: creatorId }, payAmount);

    // Pending payout is reserved (available drops), nothing on the ledger yet.
    const rev1 = await creatorRevenue(creatorId);
    expect(rev1.reservedKrw).toBe(payAmount);
    expect(rev1.availableKrw).toBe(rev0.availableKrw - payAmount);
    expect(rev1.earnedKrw).toBe(rev0.earnedKrw);
    expect(rev1.paidOutKrw).toBe(0);

    // Disburse → a single CREATOR DEBIT lands on the ledger.
    expect(await disbursePayout(payout.id)).toBe(true);

    const debits = await prisma.ledgerEntry.findMany({
      where: { accountType: "CREATOR", accountId: creatorId, direction: "DEBIT" },
    });
    expect(debits).toHaveLength(1);
    expect(debits[0]?.amountKrw).toBe(payAmount);
    expect(debits[0]?.memo).toBe(`payout_disbursed:${payout.id}`);

    const paid = await prisma.payout.findUnique({ where: { id: payout.id } });
    expect(paid?.status).toBe("PAID");
    expect(paid?.paidAt).not.toBeNull();

    // Accounting holds: lifetime earned unchanged, paidOut up, available down, no double-count.
    const rev2 = await creatorRevenue(creatorId);
    expect(rev2.earnedKrw).toBe(rev0.earnedKrw);
    expect(rev2.paidOutKrw).toBe(payAmount);
    expect(rev2.reservedKrw).toBe(0);
    expect(rev2.availableKrw).toBe(rev0.availableKrw - payAmount);
  });

  it("double disbursement is a no-op (no second DEBIT)", async () => {
    const creatorId = await fundCreator(20000);
    const rev0 = await creatorRevenue(creatorId);
    const payout = await requestPayout({ type: "CREATOR", id: creatorId }, rev0.availableKrw);

    expect(await disbursePayout(payout.id)).toBe(true);
    expect(await disbursePayout(payout.id)).toBe(false); // already PAID

    const debits = await prisma.ledgerEntry.count({
      where: { accountType: "CREATOR", accountId: creatorId, direction: "DEBIT" },
    });
    expect(debits).toBe(1);

    const rev2 = await creatorRevenue(creatorId);
    expect(rev2.availableKrw).toBe(0);
    expect(rev2.paidOutKrw).toBe(rev0.availableKrw);
  });

  it("cannot request more than the available balance", async () => {
    const creatorId = await fundCreator(9000);
    const rev = await creatorRevenue(creatorId);

    await expect(requestPayout({ type: "CREATOR", id: creatorId }, rev.availableKrw + 1)).rejects.toThrow("insufficient_balance");

    // After paying out the full balance, a further request is rejected.
    const payout = await requestPayout({ type: "CREATOR", id: creatorId }, rev.availableKrw);
    await disbursePayout(payout.id);
    await expect(requestPayout({ type: "CREATOR", id: creatorId }, 1)).rejects.toThrow("insufficient_balance");
  });
});
