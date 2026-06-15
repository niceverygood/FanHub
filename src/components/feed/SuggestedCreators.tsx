import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";

/** Right-rail "추천 크리에이터" — top creators by published-content count. */
export async function SuggestedCreators() {
  const creators = await prisma.creatorProfile.findMany({
    where: { contents: { some: { status: "PUBLISHED" } } },
    orderBy: { contents: { _count: "desc" } },
    take: 6,
    select: { handle: true, displayName: true, bio: true },
  });

  if (creators.length === 0) return null;

  return (
    <aside className="hidden w-80 shrink-0 xl:block">
      <div className="sticky top-5 py-5">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-text-muted">추천 크리에이터</h2>
          <Link href="/chart" className="text-xs text-accent hover:underline">전체</Link>
        </div>

        <div className="rounded-card border border-border bg-surface">
          {creators.map((c) => (
            <div key={c.handle} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <Link href={`/c/${c.handle}`}>
                <Avatar seed={c.handle} name={c.displayName} size={44} />
              </Link>
              <div className="min-w-0 flex-1 leading-tight">
                <Link href={`/c/${c.handle}`} className="block truncate text-sm font-semibold text-text hover:underline">
                  {c.displayName}
                </Link>
                <span className="numeric block truncate text-xs text-text-muted">@{c.handle}</span>
              </div>
              <Link
                href={`/c/${c.handle}`}
                className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-bg transition-colors hover:bg-accent-hover"
              >
                보기
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-5 px-1 text-xs leading-relaxed text-text-muted">
          FanHub · 크리에이터 콘텐츠 거래소 · 19세 이상 이용 가능
        </p>
      </div>
    </aside>
  );
}
