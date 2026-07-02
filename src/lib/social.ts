import { prisma } from "@/lib/prisma";

export interface SocialStats {
  likeCounts: Map<string, number>;
  likedByMe: Set<string>;
  commentCounts: Map<string, number>;
}

/**
 * Batched social counters for a list of content ids (live, uncached — counts
 * must reflect the caller's own toggles immediately).
 */
export async function socialStatsFor(contentIds: string[], userId?: string): Promise<SocialStats> {
  if (contentIds.length === 0) {
    return { likeCounts: new Map(), likedByMe: new Set(), commentCounts: new Map() };
  }
  const [likes, comments, mine] = await Promise.all([
    prisma.like.groupBy({
      by: ["contentId"],
      where: { contentId: { in: contentIds } },
      _count: { _all: true },
    }),
    prisma.comment.groupBy({
      by: ["contentId"],
      where: { contentId: { in: contentIds } },
      _count: { _all: true },
    }),
    userId
      ? prisma.like.findMany({
          where: { userId, contentId: { in: contentIds } },
          select: { contentId: true },
        })
      : Promise.resolve([] as { contentId: string }[]),
  ]);
  return {
    likeCounts: new Map(likes.map((l) => [l.contentId, l._count._all])),
    commentCounts: new Map(comments.map((c) => [c.contentId, c._count._all])),
    likedByMe: new Set(mine.map((m) => m.contentId)),
  };
}

/** Display name for a fan in public UI (comments). Never exposes the email. */
export function fanDisplayName(user: { id: string; name: string | null }): string {
  return user.name?.trim() || `팬 ${user.id.slice(-4)}`;
}
