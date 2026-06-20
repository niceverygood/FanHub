import { Prisma, AccountType, LedgerDirection } from "@prisma/client";
import { splitAmount } from "@/lib/money";

export const PLATFORM_ACCOUNT_ID = "platform";

type Tx = Prisma.TransactionClient;

/**
 * Double-entry purchase ledger (append-only). Per the spec:
 *  - the full gross amount is CREDITed to PLATFORM (platform receives it)
 *  - the creator share is DEBITed from PLATFORM and CREDITed to the CREATOR
 * Net result: PLATFORM keeps the platform share, CREATOR earns their share.
 * Fee rate comes from the DB Setting table (basis points), never env.
 */
export async function recordPurchaseLedger(
  tx: Tx,
  params: { orderId: string; amountKrw: number; creatorAccountId: string; creatorShareBps: number },
): Promise<void> {
  const { creatorKrw } = splitAmount(params.amountKrw, params.creatorShareBps);
  await tx.ledgerEntry.createMany({
    data: [
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
    ],
  });
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
 * Payout disbursement (append-only): when a creator's payout is marked PAID,
 * DEBIT the CREATOR account so the ledger reflects the cash leaving the
 * platform. Without this the creator's derived balance would never go down
 * after being paid. Must run inside the same tx as the PAID status transition.
 */
export async function recordPayoutDisbursement(
  tx: Tx,
  params: { creatorAccountId: string; amountKrw: number; payoutId: string },
): Promise<void> {
  await tx.ledgerEntry.create({
    data: {
      accountType: AccountType.CREATOR,
      accountId: params.creatorAccountId,
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
