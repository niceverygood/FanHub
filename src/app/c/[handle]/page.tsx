import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ContentCard } from "@/components/ContentCard";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/FollowButton";

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
      _count: { select: { followers: true } },
    },
  });

  if (!creator) notFound();

  const session = await auth();
  const myFollow = session?.user
    ? await prisma.follow.findUnique({
        where: { userId_creatorId: { userId: session.user.id, creatorId: creator.id } },
        select: { id: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Profile header */}
      <header className="flex flex-col items-center gap-5 border-b border-border pb-8 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left">
        <Avatar seed={creator.handle} name={creator.displayName} size={96} ring />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
              {creator.displayName}
            </h1>
            <FollowButton
              handle={creator.handle}
              initialFollowing={Boolean(myFollow)}
              initialCount={creator._count.followers}
              loggedIn={Boolean(session?.user)}
              self={session?.user?.id === creator.userId}
            />
          </div>
          <p className="numeric mt-1 text-sm text-text-muted">
            @{creator.handle} · 콘텐츠 <span className="text-text">{creator.contents.length}</span> ·
            팔로워 <span className="text-text">{creator._count.followers.toLocaleString()}</span>
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
