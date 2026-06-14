import { AccountType, LedgerDirection, PayoutStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CreatorRevenue {
  earnedKrw: number; // creator ledger balance = SUM(CREDIT) - SUM(DEBIT)
  reservedKrw: number; // already requested/approved/paid payouts
  availableKrw: number; // earned - reserved
  salesCount: number;
}

/** Statuses that "reserve" a creator's balance (everything except REJECTED). */
const RESERVED_PAYOUT_STATUSES = [
  PayoutStatus.REQUESTED,
  PayoutStatus.APPROVED,
  PayoutStatus.PAID,
];

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

async function reservedKrw(
  client: Prisma.TransactionClient,
  creatorId: string,
): Promise<number> {
  const agg = await client.payout.aggregate({
    where: { creatorId, status: { in: RESERVED_PAYOUT_STATUSES } },
    _sum: { amountKrw: true },
  });
  return agg._sum.amountKrw ?? 0;
}

/** Available balance computed purely from the ledger + payout reservations. */
export async function availableBalance(
  client: Prisma.TransactionClient,
  creatorId: string,
): Promise<number> {
  const [earned, reserved] = await Promise.all([
    ledgerBalance(client, creatorId),
    reservedKrw(client, creatorId),
  ]);
  return earned - reserved;
}

export async function creatorRevenue(creatorId: string): Promise<CreatorRevenue> {
  const [earnedKrw, reserved, salesCount] = await Promise.all([
    ledgerBalance(prisma, creatorId),
    reservedKrw(prisma, creatorId),
    prisma.order.count({ where: { status: "PAID", content: { creatorId } } }),
  ]);
  return {
    earnedKrw,
    reservedKrw: reserved,
    availableKrw: earnedKrw - reserved,
    salesCount,
  };
}
