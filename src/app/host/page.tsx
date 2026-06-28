import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hostRevenue } from "@/lib/studio/revenue";
import { formatKrw } from "@/lib/money";
import { PayoutForm } from "@/components/studio/PayoutForm";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-text-muted">{label}</p>
      <p className="numeric mt-1 text-xl text-text">{value}</p>
    </div>
  );
}

export default async function HostPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-sm text-text-muted">호스트 대시보드는 로그인 후 이용할 수 있습니다.</p>
        <Link href="/login" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg">로그인</Link>
      </div>
    );
  }

  const profile = await prisma.hostProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-text-muted">
        호스트 전용 공간입니다.
      </div>
    );
  }

  const [revenue, creators, payouts] = await Promise.all([
    hostRevenue(profile.id),
    prisma.creatorProfile.findMany({
      where: { hostId: profile.id },
      select: { id: true, handle: true, displayName: true, _count: { select: { contents: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payout.findMany({ where: { hostId: profile.id }, orderBy: { requestedAt: "desc" }, take: 8 }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-text">호스트</h1>
      <p className="numeric mt-1 text-sm text-text-muted">@{profile.handle} · {profile.displayName}</p>

      {/* Commission revenue (from ledger SUM) */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="누적 커미션" value={formatKrw(revenue.earnedKrw)} />
        <Stat label="정산 완료" value={formatKrw(revenue.paidOutKrw)} />
        <Stat label="가용 잔액" value={formatKrw(revenue.availableKrw)} />
        <Stat label="추천 크리에이터" value={String(creators.length)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Referred creators */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">추천 크리에이터</h2>
          <div className="rounded-card border border-border">
            {creators.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-text-muted">아직 연결된 크리에이터가 없습니다.</p>
            ) : (
              creators.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                  <span className="text-sm text-text">
                    {c.displayName} <Link href={`/c/${c.handle}`} className="numeric text-xs text-text-muted hover:text-accent">@{c.handle}</Link>
                  </span>
                  <span className="numeric text-xs text-text-muted">{c._count.contents} 콘텐츠</span>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <PayoutForm availableKrw={revenue.availableKrw} endpoint="/api/host/payouts" />

          {/* Payout history */}
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">정산 내역</h2>
            <div className="overflow-hidden rounded-card border border-border">
              {payouts.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-text-muted">정산 내역이 없습니다.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="numeric px-4 py-2 text-text">{formatKrw(p.amountKrw)}</td>
                        <td className="numeric px-4 py-2 text-right text-xs text-text-muted">{p.status}</td>
                        <td className="numeric px-4 py-2 text-right text-xs text-text-muted">{(p.paidAt ?? p.requestedAt).toISOString().slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
