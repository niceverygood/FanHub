import Link from "next/link";
import { Lock, MessageCircle, Banknote, Bookmark, MoreHorizontal, Check, BadgeCheck } from "lucide-react";
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
    <article className="animate-fade-up border-b border-border pb-6">
      {/* Creator header */}
      <div className="flex items-center gap-3 py-3">
        <Link href={`/c/${c.handle}`}>
          <Avatar seed={c.handle} name={c.displayName} size={42} ring={Boolean(drop)} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link
            href={`/c/${c.handle}`}
            className="flex items-center gap-1 text-sm font-semibold text-text hover:underline"
          >
            <span className="truncate">{c.displayName}</span>
            <BadgeCheck size={15} className="shrink-0 text-accent" />
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
        className="lift group relative block aspect-[4/5] overflow-hidden rounded-card border border-border hover:border-accent-muted"
      >
        <div
          className={`absolute inset-0 transition-transform duration-700 group-hover:scale-105 ${c.owned ? "" : "scale-110 blur-[7px]"}`}
          style={{ backgroundImage: gradientFor(c.id) }}
        />
        {/* depth scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg/50 via-transparent to-bg/10" />

        {c.owned ? (
          <span className="glass numeric absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-text">
            <Check size={13} className="text-accent" /> 보유 중
          </span>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-text shadow-soft">
              <Lock size={16} className="text-accent" />
              <span className="numeric font-medium">
                {soldOut ? "SOLD OUT" : `${formatKrw(c.priceKrw)} 잠금 해제`}
              </span>
            </span>
          </div>
        )}
        {drop ? (
          <span className="numeric absolute right-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-bg shadow-glow">
            DROP
          </span>
        ) : null}
      </Link>

      {/* Action row */}
      <div className="flex items-center gap-5 pt-3.5 text-text-muted">
        <LikeButton seed={c.id} />
        <Link href={`/content/${c.id}`} className="transition-colors hover:text-text">
          <MessageCircle size={22} />
        </Link>
        <span className="transition-colors hover:text-accent">
          <Banknote size={22} />
        </span>
        <Bookmark size={22} className="ml-auto transition-colors hover:text-text" />
      </div>

      {/* Caption + buy */}
      <div className="pt-2.5">
        <p className="text-sm text-text">
          <Link href={`/c/${c.handle}`} className="numeric font-semibold hover:underline">@{c.handle}</Link>{" "}
          {c.title}
        </p>
        <div className="mt-3.5">
          {c.owned ? (
            <Link
              href={`/content/${c.id}`}
              className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium text-text transition-colors hover:border-accent"
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
