import Link from "next/link";
import { get7dChart } from "@/lib/chart";
import { formatKrw } from "@/lib/money";
import { Sparkline } from "@/components/Sparkline";

export const dynamic = "force-dynamic";

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="numeric text-xs text-accent">NEW</span>;
  if (delta > 0) return <span className="numeric text-xs text-accent">▲{delta}</span>;
  if (delta < 0) return <span className="numeric text-xs text-text-muted">▼{Math.abs(delta)}</span>;
  return <span className="numeric text-xs text-text-muted">–</span>;
}

export default async function ChartPage() {
  const rows = await get7dChart();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">차트</h1>
        <span className="text-xs text-text-muted">7일 거래액 · 5분 캐시</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
          최근 7일 거래가 없습니다. 모의 결제로 거래를 생성해 보세요
          (<code className="numeric">pnpm db:seed:trades</code>).
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-2 py-3 font-medium">크리에이터</th>
                <th className="px-2 py-3 font-medium">추세</th>
                <th className="px-4 py-3 text-right font-medium">7일 거래액</th>
                <th className="px-4 py-3 text-right font-medium">변동</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.handle} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="numeric px-4 py-3 text-text-muted">{r.rank}</td>
                  <td className="px-2 py-3">
                    <Link href={`/c/${r.handle}`} className="text-text hover:text-accent">
                      {r.displayName}
                    </Link>
                    <span className="numeric ml-1 text-xs text-text-muted">@{r.handle}</span>
                  </td>
                  <td className="px-2 py-3">
                    <Sparkline data={r.spark} />
                  </td>
                  <td className="numeric px-4 py-3 text-right text-accent">
                    {formatKrw(r.volume7d)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeltaBadge delta={r.delta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
