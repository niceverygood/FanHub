import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatKrw } from "@/lib/money";
import { gradientFor } from "@/lib/placeholder";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-text-muted">보관함을 보려면 로그인하세요.</p>
        <Link
          href="/login"
          className="mt-4 rounded-md bg-accent px-4 py-2 font-medium text-bg hover:bg-accent-hover"
        >
          로그인
        </Link>
      </div>
    );
  }

  const entitlements = await prisma.entitlement.findMany({
    where: { buyerId: session.user.id, revokedAt: null },
    orderBy: { grantedAt: "desc" },
    include: { content: { include: { creator: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">보관함</h1>
        <span className="numeric text-xs text-text-muted">{entitlements.length} owned</span>
      </div>

      {entitlements.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
          아직 구매한 콘텐츠가 없습니다. <Link href="/" className="text-accent">탐색하기</Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {entitlements.map((e) => (
            <Link
              key={e.id}
              href={`/content/${e.contentId}`}
              className="group overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-accent-muted"
            >
              <div className="relative aspect-square">
                {/* Owned — no lock/blur. */}
                <div className="absolute inset-0" style={{ backgroundImage: gradientFor(e.contentId) }} />
                <span className="numeric absolute left-2 top-2 rounded bg-bg/70 px-1.5 py-0.5 text-[10px] text-text-muted">
                  OWNED
                </span>
              </div>
              <div className="p-3">
                <p className="truncate text-sm text-text">{e.content.title}</p>
                <p className="truncate text-xs text-text-muted">@{e.content.creator.handle}</p>
                <p className="numeric mt-1 text-xs text-text-muted">{formatKrw(e.content.priceKrw)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
