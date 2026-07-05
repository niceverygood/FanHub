import { AccountType, type Payout } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { availableBalance } from "@/lib/studio/revenue";
import { recordPayoutDisbursement } from "@/lib/payments/ledger";
import { sendPayout } from "@/lib/payments/paypal";

export class PayoutError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "PayoutError";
  }
}

/** The payee of a payout: a creator or a host (referral commission). */
export type PayoutAccount = { type: "CREATOR" | "HOST"; id: string };

const accountTypeOf = (a: PayoutAccount): AccountType =>
  a.type === "HOST" ? AccountType.HOST : AccountType.CREATOR;

/**
 * Requests a payout for a creator or host. The available balance is re-derived
 * from the ledger inside the transaction (no stored balance) and the request
 * cannot exceed it. The request itself does not touch the ledger — pending
 * payouts are "reserved" in availableBalance to prevent double-withdrawal; the
 * settling DEBIT is written later by disbursePayout.
 */
export async function requestPayout(account: PayoutAccount, amountKrw: number): Promise<Payout> {
  if (!Number.isInteger(amountKrw) || amountKrw <= 0) {
    throw new PayoutError("invalid_amount");
  }
  return prisma.$transaction(async (tx) => {
    const available = await availableBalance(tx, accountTypeOf(account), account.id);
    if (amountKrw > available) throw new PayoutError("insufficient_balance");
    return tx.payout.create({
      data: {
        amountKrw,
        status: "REQUESTED",
        ...(account.type === "HOST" ? { hostId: account.id } : { creatorId: account.id }),
      },
    });
  });
}

/**
 * Marks a payout PAID and records the disbursement DEBIT against the payee's
 * ledger account (CREATOR or HOST) — atomically. The conditional UPDATE is the
 * double-payment guard: only the first call transitions REQUESTED/APPROVED →
 * PAID, so the DEBIT is written exactly once even under concurrent calls.
 * Returns false when no such transition applies (already paid/rejected/unknown).
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
    const accountType = payout.hostId ? AccountType.HOST : AccountType.CREATOR;
    const accountId = payout.hostId ?? payout.creatorId;
    if (!accountId) throw new Error("payout_missing_account");
    await recordPayoutDisbursement(tx, {
      accountType,
      accountId,
      amountKrw: payout.amountKrw,
      payoutId: payout.id,
    });
    return true;
  });
}

/**
 * Auto-settlement: when PAYOUTS_AUTO + provider=paypal, sends the disbursed
 * amount to the payee's PayPal email via Payouts. Idempotent — senderBatchId =
 * payoutId, so PayPal rejects a duplicate send. Best-effort and OUTSIDE the
 * ledger tx: the ledger (via disbursePayout) is authoritative; a failed send is
 * reported for admin retry (calling again is safe). Returns a status.
 */
export async function autoSendPayout(payoutId: string): Promise<{ sent: boolean; detail: string }> {
  if (!(env.PAYOUTS_AUTO && env.PAYMENT_PROVIDER === "paypal")) return { sent: false, detail: "auto_disabled" };
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { creator: { select: { payoutAccountRef: true } }, host: { select: { payoutAccountRef: true } } },
  });
  if (!payout || payout.status !== "PAID") return { sent: false, detail: "not_paid" };
  const email = payout.creator?.payoutAccountRef ?? payout.host?.payoutAccountRef ?? "";
  if (!email) return { sent: false, detail: "no_payout_account" };
  try {
    const r = await sendPayout({ email, amountKrw: payout.amountKrw, senderBatchId: payout.id, note: "FanHub 정산" });
    return { sent: true, detail: `${r.batchId} ${r.status}`.trim() };
  } catch (e) {
    return { sent: false, detail: `error:${(e as Error).message.slice(0, 140)}` };
  }
}
