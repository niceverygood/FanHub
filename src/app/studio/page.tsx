import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { creatorRevenue } from "@/lib/studio/revenue";
import { formatKrw } from "@/lib/money";
import { ActionButton } from "@/components/ActionButton";
import { UploadContentForm } from "@/components/studio/UploadContentForm";
import { CreateDropForm } from "@/components/studio/CreateDropForm";
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

export default async function StudioPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-sm text-text-muted">스튜디오는 로그인 후 이용할 수 있습니다.</p>
        <Link href="/login" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg">로그인</Link>
      </div>
    );
  }

  const profile = await prisma.creatorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-text-muted">
        크리에이터 전용 공간입니다.
      </div>
    );
  }

  const [revenue, contents, payouts] = await Promise.all([
    creatorRevenue(profile.id),
    prisma.content.findMany({
      where: { creatorId: profile.id },
      include: { drop: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payout.findMany({ where: { creatorId: profile.id }, orderBy: { requestedAt: "desc" }, take: 8 }),
  ]);

  const eligibleForDrop = contents.filter((c) => c.status === "PUBLISHED" && !c.drop);
  const approved = profile.kycStatus === "APPROVED";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">스튜디오</h1>
        <span className="numeric text-sm text-text-muted">@{profile.handle}</span>
      </div>

      {/* KYC banner */}
      <div className="mt-4 flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3">
        <span className="text-sm text-text">
          KYC 상태: <span className="numeric text-accent">{profile.kycStatus}</span>
          {!approved ? <span className="ml-2 text-xs text-text-muted">승인 전에는 발행/Drop 생성이 제한됩니다.</span> : null}
        </span>
        {profile.kycStatus === "NONE" || profile.kycStatus === "REJECTED" ? (
          <ActionButton url="/api/studio/kyc/submit" label="KYC 신청" variant="primary" />
        ) : null}
      </div>

      {/* Revenue (from ledger SUM) */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="누적 수익" value={formatKrw(revenue.earnedKrw)} />
        <Stat label="정산 완료" value={formatKrw(revenue.paidOutKrw)} />
        <Stat label="가용 잔액" value={formatKrw(revenue.availableKrw)} />
        <Stat label="판매 건수" value={String(revenue.salesCount)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <UploadContentForm />
        <div className="flex flex-col gap-6">
          <CreateDropForm contents={eligibleForDrop.map((c) => ({ id: c.id, title: c.title }))} />
          <PayoutForm availableKrw={revenue.availableKrw} />
        </div>
      </div>

      {/* Content list */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">내 콘텐츠</h2>
        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-sm">
            <tbody>
              {contents.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-text-muted">아직 콘텐츠가 없습니다.</td></tr>
              ) : (
                contents.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/content/${c.id}`} className="text-text hover:text-accent">{c.title}</Link>
                      <span className="numeric ml-2 text-xs text-text-muted">{formatKrw(c.priceKrw)}</span>
                      {c.drop ? <span className="numeric ml-2 text-[10px] text-accent">DROP {c.drop.remaining}/{c.drop.totalSupply}</span> : null}
                    </td>
                    <td className="numeric px-4 py-3 text-right text-xs text-text-muted">{c.status}</td>
                    <td className="px-4 py-3 text-right">
                      {c.status !== "PUBLISHED" ? (
                        <ActionButton url={`/api/studio/contents/${c.id}/publish`} label="발행" variant="primary" />
                      ) : (
                        <ActionButton url={`/api/studio/contents/${c.id}/delist`} label="발행 취소" variant="danger" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payouts */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">정산 내역</h2>
        {payouts.length === 0 ? (
          <p className="text-xs text-text-muted">정산 신청 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="numeric text-text">{formatKrw(p.amountKrw)}</span>
                <span className="numeric text-xs text-text-muted">{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
