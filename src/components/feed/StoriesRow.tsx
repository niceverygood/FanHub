import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { avatarBg } from "@/lib/placeholder";

/** Instagram-style horizontal "stories" row of featured creators. */
export async function StoriesRow() {
  const creators = await prisma.creatorProfile.findMany({
    where: { contents: { some: { status: "PUBLISHED" } } },
    orderBy: { contents: { _count: "desc" } },
    take: 14,
    select: { handle: true, displayName: true },
  });
  if (creators.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
      {creators.map((c) => (
        <Link
          key={c.handle}
          href={`/c/${c.handle}`}
          className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="story-ring transition-transform duration-200 hover:scale-105">
            <span className="block rounded-full bg-bg p-[3px]">
              <span
                className="block h-14 w-14 rounded-full bg-cover bg-center"
                style={{ backgroundImage: avatarBg(c.handle) }}
              />
            </span>
          </span>
          <span className="numeric w-full truncate text-center text-[11px] text-text-muted">
            @{c.handle}
          </span>
        </Link>
      ))}
    </div>
  );
}
