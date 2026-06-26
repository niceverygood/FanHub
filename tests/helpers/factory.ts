import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

// All test rows use a "test-" prefix on email/handle/eventId so cleanup can
// target them without ever touching seed data.
const PREFIX = "test-";

export async function createBuyer(): Promise<{ id: string }> {
  const user = await prisma.user.create({
    data: {
      email: `${PREFIX}buyer-${randomUUID()}@test.local`,
      role: "FAN",
      ageVerifiedAt: new Date(),
    },
    select: { id: true },
  });
  return user;
}

export interface CreatorContent {
  creatorProfileId: string;
  contentId: string;
  dropId?: string;
  priceKrw: number;
}

/** Creates a HOST user + profile. Returns the HostProfile id (a ledger account id). */
export async function createHost(): Promise<{ hostProfileId: string }> {
  const handle = `${PREFIX}host-${randomUUID().slice(0, 8)}`;
  const user = await prisma.user.create({
    data: {
      email: `${PREFIX}host-${randomUUID()}@test.local`,
      role: "HOST",
      hostProfile: { create: { handle, displayName: handle } },
    },
    include: { hostProfile: true },
  });
  return { hostProfileId: user.hostProfile!.id };
}

export async function createCreatorContent(opts: {
  priceKrw: number;
  drop?: { supply: number };
  hostId?: string; // referring host → 3-way split
}): Promise<CreatorContent> {
  const handle = `${PREFIX}${randomUUID().slice(0, 12)}`;
  const user = await prisma.user.create({
    data: {
      email: `${PREFIX}creator-${randomUUID()}@test.local`,
      role: "CREATOR",
      ageVerifiedAt: new Date(),
      creatorProfile: {
        create: { handle, displayName: handle, kycStatus: "APPROVED", ...(opts.hostId ? { hostId: opts.hostId } : {}) },
      },
    },
    include: { creatorProfile: true },
  });
  const creatorProfileId = user.creatorProfile!.id;

  const content = await prisma.content.create({
    data: {
      creatorId: creatorProfileId,
      title: `${PREFIX}content`,
      type: "IMAGE_SET",
      priceKrw: opts.priceKrw,
      status: "PUBLISHED",
      assetKeys: [],
    },
  });

  let dropId: string | undefined;
  if (opts.drop) {
    const drop = await prisma.drop.create({
      data: {
        contentId: content.id,
        totalSupply: opts.drop.supply,
        remaining: opts.drop.supply,
        status: "LIVE",
        startsAt: new Date(Date.now() - 3600_000),
        endsAt: new Date(Date.now() + 3600_000),
      },
    });
    dropId = drop.id;
  }

  return { creatorProfileId, contentId: content.id, dropId, priceKrw: opts.priceKrw };
}

/** Deletes only test-prefixed rows, FK-safe order. Leaves seed data intact. */
export async function cleanupTestData(): Promise<void> {
  const [testUsers, testCreators, testHosts, testContents] = await Promise.all([
    prisma.user.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } }),
    prisma.creatorProfile.findMany({ where: { handle: { startsWith: PREFIX } }, select: { id: true } }),
    prisma.hostProfile.findMany({ where: { handle: { startsWith: PREFIX } }, select: { id: true } }),
    prisma.content.findMany({ where: { creator: { handle: { startsWith: PREFIX } } }, select: { id: true } }),
  ]);
  const userIds = testUsers.map((u) => u.id);
  const creatorIds = testCreators.map((c) => c.id);
  const hostIds = testHosts.map((h) => h.id);
  const contentIds = testContents.map((c) => c.id);

  // Orders can be reached via a test buyer OR test content; cover both.
  const orders = await prisma.order.findMany({
    where: { OR: [{ buyerId: { in: userIds } }, { contentId: { in: contentIds } }] },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  const payouts = await prisma.payout.findMany({
    where: { OR: [{ creatorId: { in: creatorIds } }, { hostId: { in: hostIds } }] },
    select: { id: true },
  });
  const payoutIds = payouts.map((p) => p.id);

  await prisma.auditLog.deleteMany({ where: { targetType: "Order", targetId: { in: orderIds } } });
  await prisma.auditLog.deleteMany({ where: { targetType: "Payout", targetId: { in: payoutIds } } });
  // Order-linked ledger entries (purchase, refund) + creator/host-account entries
  // (payout disbursements have a null orderId, so delete those by accountId).
  await prisma.ledgerEntry.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.ledgerEntry.deleteMany({ where: { accountType: "CREATOR", accountId: { in: creatorIds } } });
  await prisma.ledgerEntry.deleteMany({ where: { accountType: "HOST", accountId: { in: hostIds } } });
  // Entitlements reference both buyer and content — delete by either to avoid
  // FK violations when content is removed below.
  await prisma.entitlement.deleteMany({
    where: { OR: [{ buyerId: { in: userIds } }, { contentId: { in: contentIds } }] },
  });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.payout.deleteMany({ where: { id: { in: payoutIds } } });
  await prisma.webhookEvent.deleteMany({ where: { eventId: { startsWith: PREFIX } } });
  await prisma.drop.deleteMany({ where: { contentId: { in: contentIds } } });
  await prisma.content.deleteMany({ where: { id: { in: contentIds } } });
  // Null out creator→host refs before removing hosts (FK is SET NULL, but be explicit).
  await prisma.creatorProfile.deleteMany({ where: { id: { in: creatorIds } } });
  await prisma.hostProfile.deleteMany({ where: { id: { in: hostIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
