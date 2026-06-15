import Link from "next/link";
import { Lock } from "lucide-react";
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
 * Locked content thumbnail for grids (creator profile, etc.). Abstract gradient
 * preview (no real media), blurred, with a lock overlay — dark-luxury look.
 */
export function ContentCard({ c }: { c: ContentCardData }) {
  return (
    <Link
      href={`/content/${c.id}`}
      className="group overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-accent-muted"
    >
      <div className="relative aspect-square overflow-hidden">
        <div
          className="absolute inset-0 scale-105 blur-[3px] transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: gradientFor(c.id) }}
        />
        <div className="lock-overlay flex-col gap-2">
          <Lock size={18} className="text-text" />
          <span className="numeric rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-bg">
            {formatKrw(c.priceKrw)}
          </span>
        </div>
        {c.hasDrop ? (
          <span className="numeric absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-bg">
            DROP
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="truncate text-sm text-text">{c.title}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="numeric truncate text-xs text-text-muted">@{c.handle}</span>
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
