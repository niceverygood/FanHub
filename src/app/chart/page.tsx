import Link from "next/link";
import { get7dChart } from "@/lib/chart";
import { formatKrw } from "@/lib/money";
import { Sparkline } from "@/components/Sparkline";
import { Avatar } from "@/components/ui/Avatar";

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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text">차트</h1>
        <span className="text-xs text-text-muted">7일 거래액 · 5분 캐시</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-card border border-border bg-surface p-10 text-center text-sm text-text-muted">
          최근 7일 거래가 없습니다.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-card border border-border">
          {rows.map((r) => (
            <Link
              key={r.handle}
              href={`/c/${r.handle}`}
              className="flex items-center gap-3 border-b border-border px-3 py-3 transition-colors last:border-0 hover:bg-surface sm:px-4"
            >
              <span className="numeric w-5 shrink-0 text-center text-sm text-text-muted">{r.rank}</span>
              <Avatar seed={r.handle} name={r.displayName} size={40} />
              <div className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium text-text">{r.displayName}</span>
                <span className="numeric text-xs text-text-muted">@{r.handle}</span>
              </div>
              <div className="hidden sm:block">
                <Sparkline data={r.spark} />
              </div>
              <div className="w-24 shrink-0 text-right">
                <span className="numeric block text-sm text-accent">{formatKrw(r.volume7d)}</span>
                <DeltaBadge delta={r.delta} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
