import { AccountType, LedgerDirection, PayoutStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AccountRevenue {
  earnedKrw: number; // lifetime net share (credits − refunds), excludes payouts
  paidOutKrw: number; // total disbursed = SUM(PAID payouts), also a ledger DEBIT
  reservedKrw: number; // pending payouts (REQUESTED + APPROVED), not yet disbursed
  availableKrw: number; // current ledger balance − pending payouts
}

export interface CreatorRevenue extends AccountRevenue {
  salesCount: number;
}

/** Payouts that hold a claim on the balance but haven't hit the ledger yet. */
const PENDING_PAYOUT_STATUSES: PayoutStatus[] = [PayoutStatus.REQUESTED, PayoutStatus.APPROVED];

/**
 * Ledger balance for an account: SUM(CREDIT) − SUM(DEBIT). DEBITs include refund
 * reversals and payout disbursements, so once a payout is PAID this already
 * reflects the cash-out. Works for any account type (CREATOR, HOST, …).
 */
async function ledgerBalance(
  client: Prisma.TransactionClient,
  accountType: AccountType,
  accountId: string,
): Promise<number> {
  const grouped = await client.ledgerEntry.groupBy({
    by: ["direction"],
    where: { accountType, accountId },
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

/** Where-clause selecting an account's payouts (creator vs host). */
function payoutWhere(accountType: AccountType, accountId: string) {
  return accountType === AccountType.HOST ? { hostId: accountId } : { creatorId: accountId };
}

async function payoutSums(
  client: Prisma.TransactionClient,
  accountType: AccountType,
  accountId: string,
): Promise<{ pendingKrw: number; paidKrw: number }> {
  const grouped = await client.payout.groupBy({
    by: ["status"],
    where: payoutWhere(accountType, accountId),
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
 * Withdrawable balance = ledger balance − pending payouts. PAID payouts are
 * already subtracted from the ledger (via their DEBIT), so they are not counted
 * again here. Works for both creator and host accounts.
 */
export async function availableBalance(
  client: Prisma.TransactionClient,
  accountType: AccountType,
  accountId: string,
): Promise<number> {
  const [balance, { pendingKrw }] = await Promise.all([
    ledgerBalance(client, accountType, accountId),
    payoutSums(client, accountType, accountId),
  ]);
  return balance - pendingKrw;
}

/** Full revenue snapshot for an account (no sales count). */
export async function accountRevenue(
  accountType: AccountType,
  accountId: string,
): Promise<AccountRevenue> {
  const [balance, sums] = await Promise.all([
    ledgerBalance(prisma, accountType, accountId),
    payoutSums(prisma, accountType, accountId),
  ]);
  return {
    earnedKrw: balance + sums.paidKrw,
    paidOutKrw: sums.paidKrw,
    reservedKrw: sums.pendingKrw,
    availableKrw: balance - sums.pendingKrw,
  };
}

export async function creatorRevenue(creatorId: string): Promise<CreatorRevenue> {
  const [rev, salesCount] = await Promise.all([
    accountRevenue(AccountType.CREATOR, creatorId),
    prisma.order.count({ where: { status: "PAID", content: { creatorId } } }),
  ]);
  return { ...rev, salesCount };
}

/** Host revenue snapshot (commission earned across all referred creators). */
export async function hostRevenue(hostId: string): Promise<AccountRevenue> {
  return accountRevenue(AccountType.HOST, hostId);
}
