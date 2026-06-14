import { PrismaClient, AccountType, LedgerDirection } from "@prisma/client";
import { ulid } from "ulid";

/**
 * DEV demo data: simulated PAID purchases so the chart / ticker / library have
 * something to show. Uses the same double-entry split as the real payment path
 * (gross CREDIT→platform, creator share DEBIT platform / CREDIT creator) and
 * backdates timestamps across the last 7 days for the sparklines.
 *
 * Idempotent: re-running is a no-op once seed trades exist. Only touches
 * non-Drop published contents, so Drop stock stays pristine.
 */
const prisma = new PrismaClient();
const DAY = 86_400_000;

async function purchase(params: {
  idempotencyKey: string;
  buyerId: string;
  contentId: string;
  creatorId: string;
  amountKrw: number;
  creatorShareBps: number;
  when: Date;
}) {
  const creatorKrw = Math.floor((params.amountKrw * params.creatorShareBps) / 10_000);
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        buyerId: params.buyerId,
        contentId: params.contentId,
        amountKrw: params.amountKrw,
        status: "PAID",
        idempotencyKey: params.idempotencyKey,
        providerRef: `mock_${params.idempotencyKey}`,
        createdAt: params.when,
      },
    });
    await tx.ledgerEntry.createMany({
      data: [
        { orderId: order.id, accountType: AccountType.PLATFORM, accountId: "platform", direction: LedgerDirection.CREDIT, amountKrw: params.amountKrw, memo: "purchase_gross" },
        { orderId: order.id, accountType: AccountType.PLATFORM, accountId: "platform", direction: LedgerDirection.DEBIT, amountKrw: creatorKrw, memo: "creator_share_payable" },
        { orderId: order.id, accountType: AccountType.CREATOR, accountId: params.creatorId, direction: LedgerDirection.CREDIT, amountKrw: creatorKrw, memo: "creator_share" },
      ],
    });
    await tx.entitlement.create({
      data: { buyerId: params.buyerId, contentId: params.contentId, orderId: order.id, watermarkId: ulid(), grantedAt: params.when },
    });
    await tx.auditLog.create({
      data: { actorId: params.buyerId, action: "order_paid", targetType: "Order", targetId: order.id, meta: { seed: true }, at: params.when },
    });
    // Force PAID time (updatedAt) for the 7-day chart buckets.
    await tx.$executeRaw`UPDATE "Order" SET "updatedAt" = ${params.when} WHERE id = ${order.id}`;
  });
}

async function main() {
  const already = await prisma.order.count({ where: { idempotencyKey: { startsWith: "seed-trade-" } } });
  if (already > 0) {
    // eslint-disable-next-line no-console
    console.info(`Seed trades already present (${already}). Skipping.`);
    return;
  }

  const setting = await prisma.setting.findUnique({ where: { key: "creator_share_bps" } });
  const creatorShareBps = setting ? Number.parseInt(setting.value, 10) : 8000;

  const fans = await prisma.user.findMany({
    where: { email: { in: ["fan1@fanhub.local", "fan2@fanhub.local", "fan3@fanhub.local"] } },
  });
  const contents = await prisma.content.findMany({
    where: { status: "PUBLISHED", drop: { is: null } },
    orderBy: { id: "asc" },
  });
  if (fans.length === 0 || contents.length === 0) {
    throw new Error("Run `pnpm db:seed` first (need fans + published non-drop contents).");
  }

  const now = Date.now();
  let count = 0;

  // Pass 1: one purchase per content, spread across 7 days.
  for (let i = 0; i < contents.length; i++) {
    const c = contents[i]!;
    const fan = fans[i % fans.length]!;
    const when = new Date(now - (i % 7) * DAY - (i % 5) * 3600_000);
    await purchase({
      idempotencyKey: `seed-trade-${i}`,
      buyerId: fan.id,
      contentId: c.id,
      creatorId: c.creatorId,
      amountKrw: c.priceKrw,
      creatorShareBps,
      when,
    });
    count++;
  }

  // Pass 2: extra purchases on the first few contents to create volume spread.
  for (let i = 0; i < Math.min(7, contents.length); i++) {
    const c = contents[i]!;
    const fan = fans[(i + 1) % fans.length]!;
    const when = new Date(now - ((i + 3) % 7) * DAY - (i % 4) * 3600_000);
    await purchase({
      idempotencyKey: `seed-trade-extra-${i}`,
      buyerId: fan.id,
      contentId: c.id,
      creatorId: c.creatorId,
      amountKrw: c.priceKrw,
      creatorShareBps,
      when,
    });
    count++;
  }

  // eslint-disable-next-line no-console
  console.info(`Seeded ${count} demo trades across ${contents.length} contents.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
