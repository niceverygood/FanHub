import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/payments/orders";
import { processPaid } from "@/lib/payments/webhook";
import type { NormalizedPaymentEvent } from "@/lib/payments/provider";
import { requestPayout, disbursePayout } from "@/lib/payouts";
import { creatorRevenue, hostRevenue } from "@/lib/studio/revenue";
import { SETTING_KEYS } from "@/lib/settings";
import { createBuyer, createCreatorContent, createHost, cleanupTestData } from "../helpers/factory";

function paidEvent(orderId: string, suffix: string): NormalizedPaymentEvent {
  return { eventId: `test-evt-${orderId}-${suffix}`, type: "PAID", orderId, providerRef: `mock_${orderId}` };
}

async function buy(contentId: string): Promise<string> {
  const buyer = await createBuyer();
  const order = await createOrder({ buyerId: buyer.id, contentId, idempotencyKey: `test-idem-${randomUUID()}` });
  await processPaid(paidEvent(order.id, "pay"));
  return order.id;
}

beforeAll(async () => {
  // Deterministic split: creator 70% default, referred 80% + host 10%.
  for (const [key, value] of [
    [SETTING_KEYS.creatorShareBps, "7000"],
    [SETTING_KEYS.referredCreatorShareBps, "8000"],
    [SETTING_KEYS.hostCommissionBps, "1000"],
  ] as const) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
});

afterEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("host revenue share (3-way)", () => {
  it("referred sale splits creator 80 / host 10 / platform 10", async () => {
    const { hostProfileId } = await createHost();
    const { creatorProfileId, contentId } = await createCreatorContent({ priceKrw: 10000, hostId: hostProfileId });
    const orderId = await buy(contentId);

    const entries = await prisma.ledgerEntry.findMany({ where: { orderId } });
    const byMemo = (m: string) => entries.find((e) => e.memo === m)?.amountKrw;
    expect(byMemo("purchase_gross")).toBe(10000);
    expect(byMemo("creator_share")).toBe(8000);
    expect(byMemo("host_commission")).toBe(1000);
    expect(entries).toHaveLength(5); // gross + creator payable/credit + host payable/credit

    // Platform keeps the remainder: gross − creator − host = 10000 − 8000 − 1000.
    const platformNet = entries
      .filter((e) => e.accountType === "PLATFORM")
      .reduce((s, e) => s + (e.direction === "CREDIT" ? e.amountKrw : -e.amountKrw), 0);
    expect(platformNet).toBe(1000);

    const cRev = await creatorRevenue(creatorProfileId);
    const hRev = await hostRevenue(hostProfileId);
    expect(cRev.earnedKrw).toBe(8000);
    expect(cRev.availableKrw).toBe(8000);
    expect(hRev.earnedKrw).toBe(1000);
    expect(hRev.availableKrw).toBe(1000);
  });

  it("non-referred sale stays creator 70 / platform 30, no host entry", async () => {
    const { creatorProfileId, contentId } = await createCreatorContent({ priceKrw: 10000 });
    const orderId = await buy(contentId);

    const entries = await prisma.ledgerEntry.findMany({ where: { orderId } });
    expect(entries).toHaveLength(3); // gross + creator payable/credit only
    expect(entries.find((e) => e.memo === "creator_share")?.amountKrw).toBe(7000);
    expect(entries.some((e) => e.accountType === "HOST")).toBe(false);

    const cRev = await creatorRevenue(creatorProfileId);
    expect(cRev.earnedKrw).toBe(7000);
  });

  it("host can request and be paid out; ledger debits the host account", async () => {
    const { hostProfileId } = await createHost();
    const { contentId } = await createCreatorContent({ priceKrw: 10000, hostId: hostProfileId });
    await buy(contentId); // host accrues 1000

    const before = await hostRevenue(hostProfileId);
    expect(before.availableKrw).toBe(1000);

    const payout = await requestPayout({ type: "HOST", id: hostProfileId }, 1000);
    expect(await disbursePayout(payout.id)).toBe(true);

    const debits = await prisma.ledgerEntry.findMany({
      where: { accountType: "HOST", accountId: hostProfileId, direction: "DEBIT" },
    });
    expect(debits).toHaveLength(1);
    expect(debits[0]?.amountKrw).toBe(1000);

    const after = await hostRevenue(hostProfileId);
    expect(after.earnedKrw).toBe(1000); // lifetime stable
    expect(after.paidOutKrw).toBe(1000);
    expect(after.availableKrw).toBe(0);

    // Over-request after full payout is rejected.
    await expect(requestPayout({ type: "HOST", id: hostProfileId }, 1)).rejects.toThrow("insufficient_balance");
  });
});
