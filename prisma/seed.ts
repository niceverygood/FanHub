import { PrismaClient, ContentType, ContentStatus, DropStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEV_PASSWORD = "password1234";

// Abstract gradient placeholders only — no real media. Keys point at files that
// the media pipeline (Phase 3) would generate; seeding does not upload anything.
function previewKey(id: string) {
  return `seed/preview/${id}.png`;
}
function originalKeys(id: string, n: number) {
  return Array.from({ length: n }, (_, i) => `seed/original/${id}-${i + 1}.png`);
}

const CREATORS = [
  { handle: "noir", displayName: "Noir Studio", bio: "모노크롬 추상 시리즈" },
  { handle: "ember", displayName: "Ember", bio: "따뜻한 그라디언트 컬렉션" },
  { handle: "atlas", displayName: "Atlas", bio: "구조와 형태 실험" },
  { handle: "lumen", displayName: "Lumen", bio: "빛과 질감" },
  { handle: "void", displayName: "Void", bio: "다크 럭셔리 추상" },
];

const CONTENT_TYPES: ContentType[] = [
  ContentType.IMAGE_SET,
  ContentType.VIDEO,
  ContentType.BUNDLE,
];

async function main() {
  // 1) Revenue-share settings (basis points, integer).
  //    Non-referred creator 70% / platform 30%.
  //    Host-referred creator 80% + host 10% (+ platform 10%).
  for (const [key, value] of [
    ["creator_share_bps", "7000"],
    ["referred_creator_share_bps", "8000"],
    ["host_commission_bps", "1000"],
  ] as const) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const now = new Date();

  // 2) Admin + fans.
  await prisma.user.upsert({
    where: { email: "admin@fanhub.local" },
    update: {},
    create: { email: "admin@fanhub.local", passwordHash, role: "ADMIN", ageVerifiedAt: now },
  });

  for (let i = 1; i <= 3; i++) {
    await prisma.user.upsert({
      where: { email: `fan${i}@fanhub.local` },
      update: {},
      create: { email: `fan${i}@fanhub.local`, passwordHash, role: "FAN", ageVerifiedAt: now },
    });
  }

  // 3) Creators (KYC approved so they can publish).
  const creatorProfiles: { id: string; handle: string }[] = [];
  for (const c of CREATORS) {
    const user = await prisma.user.upsert({
      where: { email: `${c.handle}@fanhub.local` },
      update: {},
      create: {
        email: `${c.handle}@fanhub.local`,
        passwordHash,
        role: "CREATOR",
        ageVerifiedAt: now,
      },
    });
    const profile = await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      update: { displayName: c.displayName, bio: c.bio },
      create: {
        userId: user.id,
        handle: c.handle,
        displayName: c.displayName,
        bio: c.bio,
        kycStatus: "APPROVED",
      },
    });
    creatorProfiles.push({ id: profile.id, handle: c.handle });
  }

  // 4) 20 contents distributed across creators. First 16 PUBLISHED, last 4 DRAFT.
  const PRICES = [9000, 12000, 15000, 19000, 24000, 30000];
  for (let i = 0; i < 20; i++) {
    const id = `seed-content-${String(i + 1).padStart(2, "0")}`;
    const creator = creatorProfiles[i % creatorProfiles.length]!;
    const type = CONTENT_TYPES[i % CONTENT_TYPES.length]!;
    const status: ContentStatus = i < 16 ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
    await prisma.content.upsert({
      where: { id },
      update: {
        title: `${creator.handle.toUpperCase()} · Series ${i + 1}`,
        priceKrw: PRICES[i % PRICES.length]!,
        status,
      },
      create: {
        id,
        creatorId: creator.id,
        title: `${creator.handle.toUpperCase()} · Series ${i + 1}`,
        type,
        priceKrw: PRICES[i % PRICES.length]!,
        status,
        previewAssetKey: previewKey(id),
        assetKeys: originalKeys(id, type === ContentType.BUNDLE ? 8 : 4),
      },
    });
  }

  // 5) Three Drops on three published contents.
  //    remaining == totalSupply (no sales yet — sales create orders/ledger in Phase 2).
  const dropSpecs = [
    { contentId: "seed-content-01", totalSupply: 50, status: DropStatus.LIVE, offsetDays: -1, endDays: 3 },
    { contentId: "seed-content-02", totalSupply: 30, status: DropStatus.LIVE, offsetDays: 0, endDays: 2 },
    { contentId: "seed-content-03", totalSupply: 20, status: DropStatus.SCHEDULED, offsetDays: 2, endDays: 5 },
  ];
  for (let i = 0; i < dropSpecs.length; i++) {
    const d = dropSpecs[i]!;
    const id = `seed-drop-${i + 1}`;
    const startsAt = new Date(now.getTime() + d.offsetDays * 24 * 3600 * 1000);
    const endsAt = new Date(now.getTime() + d.endDays * 24 * 3600 * 1000);
    await prisma.drop.upsert({
      where: { id },
      update: { status: d.status, totalSupply: d.totalSupply, remaining: d.totalSupply, startsAt, endsAt },
      create: {
        id,
        contentId: d.contentId,
        totalSupply: d.totalSupply,
        remaining: d.totalSupply,
        status: d.status,
        startsAt,
        endsAt,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.info(
    `Seeded: ${CREATORS.length} creators, 20 contents, ${dropSpecs.length} drops. ` +
      `Dev login password for all accounts: "${DEV_PASSWORD}".`,
  );
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
