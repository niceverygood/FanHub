import { Prisma, AccountType, LedgerDirection } from "@prisma/client";

export const PLATFORM_ACCOUNT_ID = "platform";

type Tx = Prisma.TransactionClient;

/** Exact integer share of an amount at a basis-points rate (floors toward platform). */
const shareKrw = (amountKrw: number, bps: number) => Math.floor((amountKrw * bps) / 10_000);

/**
 * Double-entry purchase ledger (append-only):
 *  - the full gross amount is CREDITed to PLATFORM
 *  - the creator share is DEBITed from PLATFORM and CREDITed to the CREATOR
 *  - if the creator was referred by a host, the host commission is likewise
 *    DEBITed from PLATFORM and CREDITed to the HOST
 * Net result: PLATFORM keeps the remainder (and absorbs any rounding). All rates
 * come from the DB Setting table (basis points), never env.
 */
export async function recordPurchaseLedger(
  tx: Tx,
  params: {
    orderId: string;
    amountKrw: number;
    creatorAccountId: string;
    creatorShareBps: number;
    hostAccountId?: string | null;
    hostShareBps?: number;
  },
): Promise<void> {
  const creatorKrw = shareKrw(params.amountKrw, params.creatorShareBps);
  const hasHost = !!params.hostAccountId && (params.hostShareBps ?? 0) > 0;
  const hostKrw = hasHost ? shareKrw(params.amountKrw, params.hostShareBps ?? 0) : 0;

  const data: Prisma.LedgerEntryCreateManyInput[] = [
    {
      orderId: params.orderId,
      accountType: AccountType.PLATFORM,
      accountId: PLATFORM_ACCOUNT_ID,
      direction: LedgerDirection.CREDIT,
      amountKrw: params.amountKrw,
      memo: "purchase_gross",
    },
    {
      orderId: params.orderId,
      accountType: AccountType.PLATFORM,
      accountId: PLATFORM_ACCOUNT_ID,
      direction: LedgerDirection.DEBIT,
      amountKrw: creatorKrw,
      memo: "creator_share_payable",
    },
    {
      orderId: params.orderId,
      accountType: AccountType.CREATOR,
      accountId: params.creatorAccountId,
      direction: LedgerDirection.CREDIT,
      amountKrw: creatorKrw,
      memo: "creator_share",
    },
  ];
  if (hasHost) {
    data.push(
      {
        orderId: params.orderId,
        accountType: AccountType.PLATFORM,
        accountId: PLATFORM_ACCOUNT_ID,
        direction: LedgerDirection.DEBIT,
        amountKrw: hostKrw,
        memo: "host_commission_payable",
      },
      {
        orderId: params.orderId,
        accountType: AccountType.HOST,
        accountId: params.hostAccountId as string,
        direction: LedgerDirection.CREDIT,
        amountKrw: hostKrw,
        memo: "host_commission",
      },
    );
  }
  await tx.ledgerEntry.createMany({ data });
}

/**
 * Refund reversal (append-only): mirror every existing ledger entry for the
 * order with the opposite direction and equal amount. Reverses by reading the
 * actual originals, so it stays exact even if the fee rate later changes.
 * Original rows are never edited or deleted.
 */
export async function recordRefundReversal(tx: Tx, orderId: string): Promise<void> {
  const original = await tx.ledgerEntry.findMany({
    where: { orderId, memo: { not: "refund_reversal" } },
  });
  if (original.length === 0) return;
  await tx.ledgerEntry.createMany({
    data: original.map((e) => ({
      orderId,
      accountType: e.accountType,
      accountId: e.accountId,
      direction:
        e.direction === LedgerDirection.DEBIT ? LedgerDirection.CREDIT : LedgerDirection.DEBIT,
      amountKrw: e.amountKrw,
      memo: "refund_reversal",
    })),
  });
}

/**
 * Payout disbursement (append-only): when a payout is marked PAID, DEBIT the
 * payee's ledger account (CREATOR or HOST) so the derived balance reflects the
 * cash leaving the platform. Must run inside the same tx as the PAID transition.
 */
export async function recordPayoutDisbursement(
  tx: Tx,
  params: { accountType: AccountType; accountId: string; amountKrw: number; payoutId: string },
): Promise<void> {
  await tx.ledgerEntry.create({
    data: {
      accountType: params.accountType,
      accountId: params.accountId,
      direction: LedgerDirection.DEBIT,
      amountKrw: params.amountKrw,
      memo: `payout_disbursed:${params.payoutId}`,
    },
  });
}

/**
 * Account balance derived purely from the ledger: SUM(CREDIT) - SUM(DEBIT).
 * No balance column is ever stored or updated.
 */
export async function accountBalanceKrw(
  tx: Tx,
  accountType: AccountType,
  accountId: string,
): Promise<number> {
  const grouped = await tx.ledgerEntry.groupBy({
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
