import Link from "next/link";
import { Lock, MessageCircle, Banknote, Bookmark, MoreHorizontal, Check } from "lucide-react";
import { formatKrw } from "@/lib/money";
import { gradientFor } from "@/lib/placeholder";
import { Avatar } from "@/components/ui/Avatar";
import { LikeButton } from "@/components/feed/LikeButton";
import { BuyButton } from "@/components/BuyButton";

export interface FeedCardData {
  id: string;
  title: string;
  priceKrw: number;
  handle: string;
  displayName: string;
  owned: boolean;
  drop?: { id: string; remaining: number; total: number; status: string } | null;
}

export function FeedCard({ c }: { c: FeedCardData }) {
  const drop = c.drop ?? null;
  const soldOut = drop ? drop.status === "SOLD_OUT" || drop.remaining <= 0 : false;
  const purchasable = !drop || (drop.status === "LIVE" && drop.remaining > 0);

  return (
    <article className="border-b border-border pb-5">
      {/* Creator header */}
      <div className="flex items-center gap-3 py-3">
        <Link href={`/c/${c.handle}`}>
          <Avatar seed={c.handle} name={c.displayName} size={42} ring={Boolean(drop)} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/c/${c.handle}`} className="block truncate text-sm font-semibold text-text hover:underline">
            {c.displayName}
          </Link>
          <span className="numeric text-xs text-text-muted">
            @{c.handle}
            {drop ? <span className="text-accent"> · DROP {drop.remaining}/{drop.total}</span> : null}
          </span>
        </div>
        <MoreHorizontal size={20} className="text-text-muted" />
      </div>

      {/* Media */}
      <Link
        href={`/content/${c.id}`}
        className="group relative block aspect-[4/5] overflow-hidden rounded-card border border-border"
      >
        <div
          className={`absolute inset-0 transition-transform duration-500 group-hover:scale-105 ${c.owned ? "" : "scale-110 blur-[7px]"}`}
          style={{ backgroundImage: gradientFor(c.id) }}
        />
        {c.owned ? (
          <span className="numeric absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-bg/70 px-2 py-0.5 text-[11px] text-text">
            <Check size={12} className="text-accent" /> 보유 중
          </span>
        ) : (
          <div className="lock-overlay flex-col gap-3">
            <Lock size={26} className="text-text" />
            <span className="numeric rounded-full bg-accent px-3 py-1 text-xs font-medium text-bg">
              {soldOut ? "SOLD OUT" : `${formatKrw(c.priceKrw)} 잠금 해제`}
            </span>
          </div>
        )}
        {drop ? (
          <span className="numeric absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-bg">
            DROP
          </span>
        ) : null}
      </Link>

      {/* Action row */}
      <div className="flex items-center gap-5 pt-3 text-text-muted">
        <LikeButton seed={c.id} />
        <Link href={`/content/${c.id}`} className="transition-colors hover:text-text">
          <MessageCircle size={22} />
        </Link>
        <span className="transition-colors hover:text-text">
          <Banknote size={22} />
        </span>
        <Bookmark size={22} className="ml-auto transition-colors hover:text-text" />
      </div>

      {/* Caption + buy */}
      <div className="pt-2">
        <p className="text-sm text-text">
          <Link href={`/c/${c.handle}`} className="numeric font-semibold hover:underline">@{c.handle}</Link>{" "}
          {c.title}
        </p>
        <div className="mt-3">
          {c.owned ? (
            <Link
              href={`/content/${c.id}`}
              className="inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent"
            >
              보유 중 · 콘텐츠 보기
            </Link>
          ) : purchasable ? (
            <BuyButton contentId={c.id} dropId={drop?.id} priceKrw={c.priceKrw} />
          ) : (
            <BuyButton contentId={c.id} priceKrw={c.priceKrw} soldOut={soldOut} />
          )}
        </div>
      </div>
    </article>
  );
}
