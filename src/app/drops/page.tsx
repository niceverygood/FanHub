import { prisma } from "@/lib/prisma";
import { DropCard } from "@/components/DropCard";

export const dynamic = "force-dynamic";

export default async function DropsPage() {
  const drops = await prisma.drop.findMany({
    where: { status: { in: ["LIVE", "SCHEDULED", "SOLD_OUT"] } },
    orderBy: [{ status: "asc" }, { endsAt: "asc" }],
    include: { content: { include: { creator: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-text">Drops</h1>
      <p className="mt-1 text-sm text-text-muted">한정 수량. 재고는 실시간으로 갱신됩니다.</p>

      {drops.length === 0 ? (
        <p className="mt-8 rounded-card border border-border bg-surface p-10 text-center text-sm text-text-muted">
          진행 중인 Drop이 없습니다.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {drops.map((d) => (
            <DropCard
              key={d.id}
              dropId={d.id}
              contentId={d.contentId}
              title={d.content.title}
              handle={d.content.creator.handle}
              displayName={d.content.creator.displayName}
              priceKrw={d.content.priceKrw}
              remaining={d.remaining}
              totalSupply={d.totalSupply}
              status={d.status}
              startsAt={d.startsAt.toISOString()}
              endsAt={d.endsAt.toISOString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
