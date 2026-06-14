"use client";

import { useEffect, useState } from "react";
import { formatKrw } from "@/lib/money";

interface Trade {
  id: string;
  handle: string;
  title: string;
  amountKrw: number;
  at: string;
}

/** Live trade ticker. SSR-seeded, then polls /api/ticker every 5s. */
export function Ticker({ initial }: { initial: Trade[] }) {
  const [trades, setTrades] = useState<Trade[]>(initial);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/ticker", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { trades: Trade[] };
        setTrades(json.trades);
      } catch {
        // keep last known
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (trades.length === 0) return null;

  // Duplicate the row so the marquee scrolls seamlessly.
  const row = [...trades, ...trades];

  return (
    <div className="overflow-hidden border-b border-border bg-surface">
      <div className="animate-marquee flex w-max gap-8 whitespace-nowrap px-4 py-2">
        {row.map((t, i) => (
          <span key={`${t.id}-${i}`} className="numeric text-xs text-text-muted">
            <span className="text-accent">●</span> @{t.handle} · {t.title} ·{" "}
            <span className="text-text">{formatKrw(t.amountKrw)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
