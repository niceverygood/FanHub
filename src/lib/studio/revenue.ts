import { AccountType, LedgerDirection, PayoutStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CreatorRevenue {
  earnedKrw: number; // lifetime net creator share (credits − refunds), excludes payouts
  paidOutKrw: number; // total disbursed = SUM(PAID payouts), also a CREATOR ledger DEBIT
  reservedKrw: number; // pending payouts (REQUESTED + APPROVED), not yet disbursed
  availableKrw: number; // current ledger balance − pending payouts
  salesCount: number;
}

/** Payouts that hold a claim on the balance but haven't hit the ledger yet. */
const PENDING_PAYOUT_STATUSES: PayoutStatus[] = [PayoutStatus.REQUESTED, PayoutStatus.APPROVED];

/**
 * Creator ledger balance: SUM(CREDIT) − SUM(DEBIT). DEBITs include refund
 * reversals and payout disbursements, so once a payout is PAID this already
 * reflects the cash-out.
 */
async function ledgerBalance(
  client: Prisma.TransactionClient,
  creatorId: string,
): Promise<number> {
  const grouped = await client.ledgerEntry.groupBy({
    by: ["direction"],
    where: { accountType: AccountType.CREATOR, accountId: creatorId },
    _sum: { amountKrw: true },
  });
  let credit = 0;
  let debit = 0;
  for (const g of grouped) {
    if (g.direction === LedgerDirection.CREDIT) credit = g._sum.amountKrw ?? 0;
    else debit = g._sum.amountKrw ?? 0;
  }
  return credit - debit;
}

/** Sum of payout amounts split into pending (REQUESTED/APPROVED) and paid. */
async function payoutSums(
  client: Prisma.TransactionClient,
  creatorId: string,
): Promise<{ pendingKrw: number; paidKrw: number }> {
  const grouped = await client.payout.groupBy({
    by: ["status"],
    where: { creatorId },
    _sum: { amountKrw: true },
  });
  let pendingKrw = 0;
  let paidKrw = 0;
  for (const g of grouped) {
    const amt = g._sum.amountKrw ?? 0;
    if (PENDING_PAYOUT_STATUSES.includes(g.status)) pendingKrw += amt;
    else if (g.status === PayoutStatus.PAID) paidKrw += amt;
  }
  return { pendingKrw, paidKrw };
}

/**
 * Withdrawable balance = current ledger balance − pending payouts. PAID payouts
 * are already subtracted from the ledger balance (via their DEBIT), so they are
 * intentionally NOT counted here again.
 */
export async function availableBalance(
  client: Prisma.TransactionClient,
  creatorId: string,
): Promise<number> {
  const [balance, { pendingKrw }] = await Promise.all([
    ledgerBalance(client, creatorId),
    payoutSums(client, creatorId),
  ]);
  return balance - pendingKrw;
}

export async function creatorRevenue(creatorId: string): Promise<CreatorRevenue> {
  const [balance, sums, salesCount] = await Promise.all([
    ledgerBalance(prisma, creatorId),
    payoutSums(prisma, creatorId),
    prisma.order.count({ where: { status: "PAID", content: { creatorId } } }),
  ]);
  // Lifetime earned = current balance + what's already been paid out (added back
  // since payouts are DEBITed from the balance). This stays stable across payouts.
  return {
    earnedKrw: balance + sums.paidKrw,
    paidOutKrw: sums.paidKrw,
    reservedKrw: sums.pendingKrw,
    availableKrw: balance - sums.pendingKrw,
    salesCount,
  };
}
