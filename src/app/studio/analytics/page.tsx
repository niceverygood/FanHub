import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { creatorAnalytics } from "@/lib/studio/analytics";
import { formatKrw } from "@/lib/money";

export const dynamic = "force-dynamic";

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`numeric mt-1 text-xl ${accent ? "text-accent" : "text-text"}`}>{value}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-sm text-text-muted">스튜디오는 로그인 후 이용할 수 있습니다.</p>
        <Link href="/login" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg">로그인</Link>
      </div>
    );
  }
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-text-muted">크리에이터 전용 공간입니다.</div>;
  }

  const a = await creatorAnalytics(profile.id);
  const maxRev = Math.max(...a.daily.map((d) => d.revenue), 1);
  const repeatPct = a.uniqueBuyers > 0 ? Math.round((a.repeatBuyers / a.uniqueBuyers) * 100) : 0;

  // bar chart geometry
  const W = 720, H = 150, n = a.daily.length, gap = 3;
  const bw = (W - gap * (n - 1)) / n;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">애널리틱스</h1>
        <Link href="/studio" className="text-sm text-accent hover:underline">← 스튜디오</Link>
      </div>
      <p className="mt-1 text-sm text-text-muted">@{profile.handle} · 내 콘텐츠 판매 인사이트</p>

      {/* summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="총 판매" value={`${a.totalSalesCount}건`} />
        <Stat label="총 거래액" value={formatKrw(a.grossKrw)} />
        <Stat label="내 수익" value={formatKrw(a.earnedKrw)} accent />
        <Stat label="평균 주문" value={formatKrw(a.avgOrderKrw)} />
        <Stat label="순 구매자" value={`${a.uniqueBuyers}명`} />
        <Stat label="재구매율" value={`${repeatPct}%`} />
      </div>

      {/* 30-day sales */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">최근 30일 거래액</h2>
        <div className="rounded-card border border-border bg-surface p-5">
          {a.grossKrw === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">아직 판매 데이터가 없습니다.</p>
          ) : (
            <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" preserveAspectRatio="none">
              {a.daily.map((d, i) => {
                const h = Math.round((d.revenue / maxRev) * H);
                const x = i * (bw + gap);
                return (
                  <g key={d.date}>
                    <rect x={x} y={H - h} width={bw} height={h} rx={2} fill="#F3701F" opacity={d.revenue > 0 ? 0.9 : 0.15} />
                  </g>
                );
              })}
              {/* first / mid / last date labels */}
              {[0, Math.floor(n / 2), n - 1].map((i) => (
                <text key={i} x={i * (bw + gap) + bw / 2} y={H + 18} fontSize="11" fill="#8B8B8B" textAnchor="middle" fontFamily="Menlo, monospace">
                  {a.daily[i]!.date.slice(5)}
                </text>
              ))}
            </svg>
          )}
        </div>
      </section>

      {/* top content */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">콘텐츠별 판매 TOP</h2>
        <div className="overflow-hidden rounded-card border border-border">
          {a.topContent.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-muted">판매된 콘텐츠가 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted">
                  <th className="px-4 py-2 text-left font-medium">콘텐츠</th>
                  <th className="px-4 py-2 text-right font-medium">판매</th>
                  <th className="px-4 py-2 text-right font-medium">거래액</th>
                </tr>
              </thead>
              <tbody>
                {a.topContent.map((c) => (
                  <tr key={c.contentId} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text">{c.title}</td>
                    <td className="numeric px-4 py-2.5 text-right text-text-muted">{c.count}</td>
                    <td className="numeric px-4 py-2.5 text-right text-accent">{formatKrw(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* drop sell-through */}
      {a.drops.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">드롭 소진율</h2>
          <div className="overflow-hidden rounded-card border border-border">
            {a.drops.map((d, i) => (
              <div key={i} className="border-b border-border px-4 py-3 last:border-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-text">{d.title} <span className="numeric ml-1 text-xs text-text-muted">{d.status}</span></span>
                  <span className="numeric text-xs text-text-muted">{d.sold}/{d.total} · {d.pct}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-surface-elevated">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
