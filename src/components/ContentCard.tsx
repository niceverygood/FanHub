import Link from "next/link";
import { formatKrw } from "@/lib/money";
import { gradientFor } from "@/lib/placeholder";

export interface ContentCardData {
  id: string;
  title: string;
  handle: string;
  priceKrw: number;
  hasDrop?: boolean;
  dropRemaining?: number | null;
  dropTotal?: number | null;
}

/**
 * Locked content thumbnail. The preview is an abstract gradient (no real
 * media), blurred, with a lock overlay — the luxury-dark exchange look.
 */
export function ContentCard({ c }: { c: ContentCardData }) {
  return (
    <Link
      href={`/content/${c.id}`}
      className="group overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-accent-muted"
    >
      <div className="relative aspect-square">
        <div
          className="absolute inset-0 blur-[2px]"
          style={{ backgroundImage: gradientFor(c.id) }}
        />
        <div className="lock-overlay">
          <span aria-label="잠김" className="text-text-muted">🔒</span>
        </div>
        {c.hasDrop ? (
          <span className="numeric absolute left-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-bg">
            DROP
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="truncate text-sm text-text">{c.title}</p>
        <p className="truncate text-xs text-text-muted">@{c.handle}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="numeric text-sm text-accent">{formatKrw(c.priceKrw)}</span>
          {c.hasDrop && c.dropRemaining != null && c.dropTotal != null ? (
            <span className="numeric text-xs text-text-muted">
              {c.dropRemaining}/{c.dropTotal}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
