import type { Payout } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { availableBalance } from "@/lib/studio/revenue";

export class PayoutError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "PayoutError";
  }
}

/**
 * Requests a payout. The available balance is re-derived from the ledger inside
 * the transaction (no stored balance), and the request cannot exceed it. A
 * payout never touches the ledger — it settles already-earned balance; the
 * "reserved" accounting in availableBalance prevents double-withdrawal.
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
