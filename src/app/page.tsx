import { prisma } from "@/lib/prisma";
import { getRecentTrades } from "@/lib/ticker";
import { Ticker } from "@/components/Ticker";
import { ContentCard } from "@/components/ContentCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [contents, trades] = await Promise.all([
    prisma.content.findMany({
      where: { status: "PUBLISHED" },
      include: { creator: true, drop: true },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    getRecentTrades(20),
  ]);

  return (
    <div>
      <Ticker initial={trades} />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <section className="mb-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            크리에이터 콘텐츠 거래소
          </h1>
          <p className="mt-2 max-w-xl text-sm text-text-muted">
            한정 수량 Drop, 실시간 크리에이터 차트, 콘텐츠 단위 거래. 구매한 콘텐츠는
            보관함에 쌓입니다.
          </p>
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              발행된 콘텐츠
            </h2>
            <span className="numeric text-xs text-text-muted">{contents.length} items</span>
          </div>

          {contents.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
              아직 발행된 콘텐츠가 없습니다. <code className="numeric">pnpm db:seed</code> 를 실행하세요.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {contents.map((c) => (
                <ContentCard
                  key={c.id}
                  c={{
                    id: c.id,
                    title: c.title,
                    handle: c.creator.handle,
                    priceKrw: c.priceKrw,
                    hasDrop: Boolean(c.drop),
                    dropRemaining: c.drop?.remaining ?? null,
                    dropTotal: c.drop?.totalSupply ?? null,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
