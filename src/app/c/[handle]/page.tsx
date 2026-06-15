import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContentCard } from "@/components/ContentCard";
import { Avatar } from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: { params: { handle: string } }) {
  const creator = await prisma.creatorProfile.findUnique({
    where: { handle: params.handle },
    include: {
      contents: {
        where: { status: "PUBLISHED" },
        include: { drop: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!creator) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Profile header */}
      <header className="flex flex-col items-center gap-5 border-b border-border pb-8 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left">
        <Avatar seed={creator.handle} name={creator.displayName} size={96} ring />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
            {creator.displayName}
          </h1>
          <p className="numeric mt-1 text-sm text-text-muted">
            @{creator.handle} · 콘텐츠 <span className="text-text">{creator.contents.length}</span>
          </p>
          {creator.bio ? (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text">{creator.bio}</p>
          ) : null}
        </div>
      </header>

      <section className="mt-8">
        {creator.contents.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-10 text-center text-sm text-text-muted">
            아직 판매 중인 콘텐츠가 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {creator.contents.map((c) => (
              <ContentCard
                key={c.id}
                c={{
                  id: c.id,
                  title: c.title,
                  handle: creator.handle,
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
    </div>
  );
}
