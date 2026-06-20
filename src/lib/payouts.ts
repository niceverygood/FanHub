import type { Payout } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { availableBalance } from "@/lib/studio/revenue";
import { recordPayoutDisbursement } from "@/lib/payments/ledger";

export class PayoutError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "PayoutError";
  }
}

/**
 * Requests a payout. The available balance is re-derived from the ledger inside
 * the transaction (no stored balance), and the request cannot exceed it. The
 * request itself does not touch the ledger — pending payouts are "reserved" in
 * availableBalance to prevent double-withdrawal; the settling DEBIT is written
 * later by disbursePayout when the payout is actually paid.
 */
export async function requestPayout(creatorId: string, amountKrw: number): Promise<Payout> {
  if (!Number.isInteger(amountKrw) || amountKrw <= 0) {
    throw new PayoutError("invalid_amount");
  }
  return prisma.$transaction(async (tx) => {
    const available = await availableBalance(tx, creatorId);
    if (amountKrw > available) throw new PayoutError("insufficient_balance");
    return tx.payout.create({
      data: { creatorId, amountKrw, status: "REQUESTED" },
    });
  });
}

/**
 * Marks a payout PAID and records the disbursement DEBIT against the creator's
 * ledger account — atomically. The conditional UPDATE is the double-payment
 * guard: only the first call transitions REQUESTED/APPROVED → PAID, so the
 * DEBIT is written exactly once even under concurrent calls. Returns false when
 * no such transition applies (already paid/rejected, or unknown id).
 */
export async function disbursePayout(payoutId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });
    if (!payout) return false;
    const res = await tx.payout.updateMany({
      where: { id: payoutId, status: { in: ["REQUESTED", "APPROVED"] } },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (res.count === 0) return false;
    await recordPayoutDisbursement(tx, {
      creatorAccountId: payout.creatorId,
      amountKrw: payout.amountKrw,
      payoutId: payout.id,
    });
    return true;
  });
}
