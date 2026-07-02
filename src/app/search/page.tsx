import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ContentCard } from "@/components/ContentCard";
import { Avatar } from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const q = (typeof searchParams.q === "string" ? searchParams.q : "").trim().slice(0, 60);

  const [creators, contents] = q
    ? await Promise.all([
        prisma.creatorProfile.findMany({
          where: {
            OR: [
              { handle: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 10,
          select: {
            handle: true,
            displayName: true,
            bio: true,
            _count: { select: { followers: true, contents: { where: { status: "PUBLISHED" } } } },
          },
        }),
        prisma.content.findMany({
          where: { status: "PUBLISHED", title: { contains: q, mode: "insensitive" } },
          include: { creator: true, drop: true },
          orderBy: { createdAt: "desc" },
          take: 24,
        }),
      ])
    : [[], []];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-xl font-semibold text-text">검색</h1>

      <form action="/search" method="get" className="mt-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            name="q"
            defaultValue={q}
            maxLength={60}
            placeholder="크리에이터·콘텐츠 검색"
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
        >
          검색
        </button>
      </form>

      {!q ? (
        <p className="mt-8 text-sm text-text-muted">핸들, 크리에이터 이름 또는 콘텐츠 제목으로 검색하세요.</p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-text-muted">크리에이터</h2>
            {creators.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">일치하는 크리에이터가 없습니다.</p>
            ) : (
              <div className="mt-3 rounded-card border border-border bg-surface">
                {creators.map((c) => (
                  <Link
                    key={c.handle}
                    href={`/c/${c.handle}`}
                    className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-bg/40"
                  >
                    <Avatar seed={c.handle} name={c.displayName} size={44} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-semibold text-text">{c.displayName}</span>
                      <span className="numeric block truncate text-xs text-text-muted">
                        @{c.handle} · 콘텐츠 {c._count.contents} · 팔로워 {c._count.followers.toLocaleString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-text-muted">콘텐츠</h2>
            {contents.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">일치하는 콘텐츠가 없습니다.</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {contents.map((c) => (
                  <ContentCard
                    key={c.id}
                    c={{
                      id: c.id,
                      title: c.title,
                      handle: c.creator.handle,
                      priceKrw: c.priceKrw,
                      hasDrop: Boolean(c.drop),
                      dropRemaining: c.drop?.remaining ?? null,
                      dropTotal: c.drop?.totalSupply ?? null,
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
