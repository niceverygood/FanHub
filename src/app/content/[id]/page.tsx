import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { entitlementFor } from "@/lib/media";
import { formatKrw } from "@/lib/money";
import { previewBg } from "@/lib/placeholder";
import { Avatar } from "@/components/ui/Avatar";
import { BuyButton } from "@/components/BuyButton";
import { ContentViewer } from "@/components/ContentViewer";
import { ReportButton } from "@/components/ReportButton";

export const dynamic = "force-dynamic";

export default async function ContentPage({ params }: { params: { id: string } }) {
  const content = await prisma.content.findUnique({
    where: { id: params.id },
    include: { creator: true, drop: true },
  });
  if (!content || content.status === "DRAFT") notFound();

  const session = await auth();
  const entitlement = session?.user ? await entitlementFor(session.user.id, content.id) : null;
  const owned = Boolean(entitlement);

  const drop = content.drop;
  const soldOut = drop ? drop.status === "SOLD_OUT" || drop.remaining <= 0 : false;
  const purchasable =
    content.status === "PUBLISHED" && (!drop || (drop.status === "LIVE" && drop.remaining > 0));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Creator header */}
      <div className="flex items-center gap-3 pb-4">
        <Link href={`/c/${content.creator.handle}`}>
          <Avatar seed={content.creator.handle} name={content.creator.displayName} size={44} ring={Boolean(drop)} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/c/${content.creator.handle}`} className="block truncate text-sm font-semibold text-text hover:underline">
            {content.creator.displayName}
          </Link>
          <span className="numeric text-xs text-text-muted">
            @{content.creator.handle}
            {drop ? <span className="text-accent"> · DROP {drop.remaining}/{drop.totalSupply}</span> : null}
          </span>
        </div>
      </div>

      {/* Media / viewer */}
      {owned ? (
        <ContentViewer contentId={content.id} />
      ) : (
        <div className="relative aspect-[4/5] overflow-hidden rounded-card border border-border">
          <div className="absolute inset-0 scale-110 bg-cover bg-center blur-[7px]" style={{ backgroundImage: previewBg(content.id) }} />
          <div className="lock-overlay flex-col gap-3">
            <Lock size={28} className="text-text" />
            <span className="numeric rounded-full bg-accent px-3 py-1 text-xs font-medium text-bg">
              {soldOut ? "SOLD OUT" : `${formatKrw(content.priceKrw)} 잠금 해제`}
            </span>
          </div>
          {drop ? (
            <span className="numeric absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-bg">
              DROP
            </span>
          ) : null}
        </div>
      )}

      {/* Title + price + action */}
      <div className="mt-5">
        <h1 className="font-display text-xl font-semibold tracking-tight text-text">{content.title}</h1>
        <p className="numeric mt-1 text-2xl text-accent">{formatKrw(content.priceKrw)}</p>

        <div className="mt-5">
          {owned ? (
            <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-text">
              보유 중 · <Link href="/library" className="text-accent">보관함에서 보기</Link>
            </p>
          ) : purchasable ? (
            <BuyButton contentId={content.id} dropId={drop?.id} priceKrw={content.priceKrw} />
          ) : (
            <BuyButton contentId={content.id} priceKrw={content.priceKrw} soldOut={soldOut} />
          )}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-text-muted">
          결제 성공 여부는 서버 웹훅으로만 확정됩니다. 콘텐츠 접근은 구매로 생성된 Entitlement에
          근거합니다.
        </p>
        <div className="mt-3">
          <ReportButton contentId={content.id} />
        </div>
      </div>
    </div>
  );
}
