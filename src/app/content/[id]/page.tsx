import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { entitlementFor } from "@/lib/media";
import { formatKrw } from "@/lib/money";
import { gradientFor } from "@/lib/placeholder";
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Media column */}
        <div>
          {owned ? (
            <ContentViewer contentId={content.id} />
          ) : (
            <div className="relative aspect-square overflow-hidden rounded-card border border-border">
              <div
                className="absolute inset-0 blur-[3px]"
                style={{ backgroundImage: gradientFor(content.id) }}
              />
              <div className="lock-overlay flex-col gap-2">
                <span className="text-2xl">🔒</span>
                <span className="text-xs text-text-muted">구매 후 열람 가능</span>
              </div>
            </div>
          )}
        </div>

        {/* Detail column */}
        <div>
          {drop ? (
            <span className="numeric mb-2 inline-block rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-bg">
              DROP · {drop.remaining}/{drop.totalSupply}
            </span>
          ) : null}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
            {content.title}
          </h1>
          <Link
            href={`/c/${content.creator.handle}`}
            className="numeric mt-1 inline-block text-sm text-text-muted hover:text-accent"
          >
            @{content.creator.handle}
          </Link>

          <p className="numeric mt-6 text-3xl text-accent">{formatKrw(content.priceKrw)}</p>

          <div className="mt-6">
            {owned ? (
              <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-text">
                보유 중 · <Link href="/library" className="text-accent">보관함</Link>
              </p>
            ) : purchasable ? (
              <BuyButton contentId={content.id} dropId={drop?.id} priceKrw={content.priceKrw} />
            ) : (
              <BuyButton
                contentId={content.id}
                priceKrw={content.priceKrw}
                soldOut={soldOut}
              />
            )}
          </div>

          <p className="mt-4 text-xs text-text-muted">
            결제 성공 여부는 서버 웹훅으로만 확정됩니다. 콘텐츠 접근은 구매로 생성된
            Entitlement에 근거합니다.
          </p>
          <div className="mt-3">
            <ReportButton contentId={content.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
