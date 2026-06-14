import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatKrw } from "@/lib/money";
import { ActionButton } from "@/components/ActionButton";

export const dynamic = "force-dynamic";

async function platformBalance(): Promise<number> {
  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["direction"],
    where: { accountType: "PLATFORM", accountId: "platform" },
    _sum: { amountKrw: true },
  });
  let credit = 0;
  let debit = 0;
  for (const g of grouped) {
    if (g.direction === "CREDIT") credit = g._sum.amountKrw ?? 0;
    else debit = g._sum.amountKrw ?? 0;
  }
  return credit - debit;
}

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-text-muted">
        관리자 전용 페이지입니다.
      </div>
    );
  }

  const [kycQueue, reports, payouts, recentOrders, platformKrw] = await Promise.all([
    prisma.creatorProfile.findMany({ where: { kycStatus: "PENDING" }, orderBy: { updatedAt: "asc" } }),
    prisma.report.findMany({ where: { status: "OPEN" }, include: { content: true }, orderBy: { createdAt: "asc" }, take: 20 }),
    prisma.payout.findMany({ where: { status: { in: ["REQUESTED", "APPROVED"] } }, include: { creator: true }, orderBy: { requestedAt: "asc" }, take: 20 }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { content: true } }),
    platformBalance(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-text">어드민</h1>
      <p className="numeric mt-1 text-sm text-text-muted">플랫폼 잔액 {formatKrw(platformKrw)}</p>

      {/* KYC queue */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">KYC 승인 큐</h2>
        <div className="rounded-card border border-border">
          {kycQueue.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-muted">대기 중인 신청이 없습니다.</p>
          ) : (
            kycQueue.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                <span className="text-sm text-text">{c.displayName} <span className="numeric text-xs text-text-muted">@{c.handle}</span></span>
                <span className="flex gap-2">
                  <ActionButton url="/api/admin/kyc" body={{ creatorId: c.id, decision: "APPROVE" }} label="승인" variant="primary" />
                  <ActionButton url="/api/admin/kyc" body={{ creatorId: c.id, decision: "REJECT" }} label="거절" variant="danger" />
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Reports */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">콘텐츠 신고</h2>
        <div className="rounded-card border border-border">
          {reports.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-muted">처리할 신고가 없습니다.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                <span className="text-sm">
                  <Link href={`/content/${r.contentId}`} className="text-text hover:text-accent">{r.content.title}</Link>
                  <span className="ml-2 text-xs text-text-muted">{r.reason}</span>
                </span>
                <span className="flex gap-2">
                  <ActionButton url={`/api/admin/reports/${r.id}`} body={{ decision: "RESOLVE", delist: true }} label="삭제·해결" variant="danger" />
                  <ActionButton url={`/api/admin/reports/${r.id}`} body={{ decision: "DISMISS" }} label="기각" />
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Payouts */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">정산 처리</h2>
        <div className="rounded-card border border-border">
          {payouts.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-muted">대기 중인 정산이 없습니다.</p>
          ) : (
            payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                <span className="text-sm text-text">
                  {p.creator.displayName} <span className="numeric text-accent">{formatKrw(p.amountKrw)}</span>
                  <span className="numeric ml-2 text-xs text-text-muted">{p.status}</span>
                </span>
                <span className="flex gap-2">
                  <ActionButton url={`/api/admin/payouts/${p.id}`} body={{ decision: "PAY" }} label="지급" variant="primary" />
                  <ActionButton url={`/api/admin/payouts/${p.id}`} body={{ decision: "REJECT" }} label="거절" variant="danger" />
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Orders / ledger snapshot */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">최근 주문</h2>
        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-sm">
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text">{o.content?.title ?? o.contentId}</td>
                  <td className="numeric px-4 py-2 text-right text-text-muted">{formatKrw(o.amountKrw)}</td>
                  <td className="numeric px-4 py-2 text-right text-xs text-text-muted">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
