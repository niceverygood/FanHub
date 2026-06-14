import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContentCard } from "@/components/ContentCard";

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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">
          {creator.displayName}
        </h1>
        <p className="numeric mt-1 text-sm text-text-muted">@{creator.handle}</p>
        {creator.bio ? <p className="mt-3 max-w-xl text-sm text-text">{creator.bio}</p> : null}
      </header>

      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">콘텐츠</h2>
          <span className="numeric text-xs text-text-muted">{creator.contents.length} items</span>
        </div>
        {creator.contents.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
            아직 판매 중인 콘텐츠가 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
