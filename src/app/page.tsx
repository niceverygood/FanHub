import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getFeedContents } from "@/lib/feed";
import { getRecentTrades } from "@/lib/ticker";
import { Ticker } from "@/components/Ticker";
import { FeedCard } from "@/components/feed/FeedCard";
import { StoriesRow } from "@/components/feed/StoriesRow";
import { SuggestedCreators } from "@/components/feed/SuggestedCreators";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  const [contents, trades, ents] = await Promise.all([
    getFeedContents(),
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
          <div className="relative overflow-hidden rounded-card border border-border bg-surface p-6 shadow-soft sm:p-8">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(120% 120% at 0% 0%, rgba(243,112,31,0.16), transparent 55%)" }}
            />
            <div className="glow-pulse pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
            <div className="relative">
              <p className="numeric text-[11px] uppercase tracking-[0.25em] text-accent">FanHub · Premium</p>
              <h1 className="mt-2 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-text sm:text-4xl">
                원하는 순간을
                <br />
                <span className="text-gradient">잠금 해제</span>하세요
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
                한정 <span className="text-text">Drop</span> · 콘텐츠 단위 구매 · 구매하면{" "}
                <span className="text-text">보관함</span>에 영구 저장.
              </p>
              <div className="mt-5 flex gap-2">
                <Link href="/drops" className="btn-accent rounded-full px-5 py-2.5 text-sm font-semibold">
                  Drops 둘러보기
                </Link>
                <Link
                  href="/chart"
                  className="glass rounded-full px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent"
                >
                  실시간 차트
                </Link>
              </div>
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
                    handle: c.handle,
                    displayName: c.displayName,
                    owned: owned.has(c.id),
                    drop: c.drop,
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
