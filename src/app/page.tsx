import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getRecentTrades } from "@/lib/ticker";
import { Ticker } from "@/components/Ticker";
import { FeedCard } from "@/components/feed/FeedCard";
import { StoriesRow } from "@/components/feed/StoriesRow";
import { SuggestedCreators } from "@/components/feed/SuggestedCreators";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  const [contents, trades, ents] = await Promise.all([
    prisma.content.findMany({
      where: { status: "PUBLISHED" },
      include: { creator: true, drop: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    getRecentTrades(20),
    session?.user
      ? prisma.entitlement.findMany({
          where: { buyerId: session.user.id, revokedAt: null },
          select: { contentId: true },
        })
      : Promise.resolve([] as { contentId: string }[]),
  ]);

  const owned = new Set(ents.map((e) => e.contentId));

  return (
    <div>
      <Ticker initial={trades} />

      <div className="mx-auto flex justify-center gap-8 px-3 sm:px-4">
        <section className="w-full max-w-[600px] py-5">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-card border border-border bg-surface p-5 shadow-soft">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
            <p className="numeric text-[11px] uppercase tracking-[0.2em] text-accent">FanHub</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-text">
              크리에이터 콘텐츠 거래소
            </h1>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-text-muted">
              한정 <span className="text-text">Drop</span> · 콘텐츠 단위 구매 · 구매하면{" "}
              <span className="text-text">보관함</span>에 영구 저장.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/drops" className="btn-accent rounded-full px-4 py-2 text-sm font-semibold">
                Drops 보기
              </Link>
              <Link
                href="/chart"
                className="rounded-full border border-border px-4 py-2 text-sm text-text transition-colors hover:border-accent"
              >
                실시간 차트
              </Link>
            </div>
          </div>

          {/* Featured creators (stories) */}
          <div className="mt-5">
            <StoriesRow />
          </div>

          <div className="mt-1 border-t border-border" />

          {contents.length === 0 ? (
            <p className="mt-5 rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
              아직 발행된 콘텐츠가 없습니다.
            </p>
          ) : (
            <div className="mt-1 flex flex-col gap-2">
              {contents.map((c) => (
                <FeedCard
                  key={c.id}
                  c={{
                    id: c.id,
                    title: c.title,
                    priceKrw: c.priceKrw,
                    handle: c.creator.handle,
                    displayName: c.creator.displayName,
                    owned: owned.has(c.id),
                    drop: c.drop
                      ? { id: c.drop.id, remaining: c.drop.remaining, total: c.drop.totalSupply, status: c.drop.status }
                      : null,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <SuggestedCreators />
      </div>
    </div>
  );
}
