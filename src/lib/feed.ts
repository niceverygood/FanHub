import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Cached, plain-serializable home data (in-region Next data cache). Global data
 * only — per-user state (owned entitlements) is fetched live in the page. Short
 * revalidate keeps the feed fresh enough for a marketplace while making warm
 * loads near-instant.
 */
export interface FeedContent {
  id: string;
  title: string;
  priceKrw: number;
  handle: string;
  displayName: string;
  drop: { id: string; remaining: number; total: number; status: string } | null;
}

export const getFeedContents = unstable_cache(
  async (): Promise<FeedContent[]> => {
    const rows = await prisma.content.findMany({
      where: { status: "PUBLISHED" },
      include: { creator: true, drop: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return rows.map((c) => ({
      id: c.id,
      title: c.title,
      priceKrw: c.priceKrw,
      handle: c.creator.handle,
      displayName: c.creator.displayName,
      drop: c.drop
        ? { id: c.drop.id, remaining: c.drop.remaining, total: c.drop.totalSupply, status: c.drop.status }
        : null,
    }));
  },
  ["feed-contents"],
  { revalidate: 30 },
);

export interface TopCreator {
  handle: string;
  displayName: string;
  bio: string | null;
}

export const getTopCreators = unstable_cache(
  async (): Promise<TopCreator[]> =>
    prisma.creatorProfile.findMany({
      where: { contents: { some: { status: "PUBLISHED" } } },
      orderBy: { contents: { _count: "desc" } },
      take: 14,
      select: { handle: true, displayName: true, bio: true },
    }),
  ["top-creators"],
  { revalidate: 60 },
);
