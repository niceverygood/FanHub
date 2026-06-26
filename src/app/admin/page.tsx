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

interface CreatorSummary {
  id: string;
  handle: string;
  displayName: string;
  earnedKrw: number; // lifetime net share (incl. already paid out)
  availableKrw: number; // ledger balance − pending payouts
  pendingKrw: number; // REQUESTED + APPROVED
  paidOutKrw: number; // PAID
}

/** Per-creator revenue split, derived from the ledger + payout rows (no N+1). */
async function creatorSummaries(): Promise<CreatorSummary[]> {
  const [ledgerRows, payoutRows, profiles] = await Promise.all([
    prisma.ledgerEntry.groupBy({
      by: ["accountId", "direction"],
      where: { accountType: "CREATOR" },
      _sum: { amountKrw: true },
    }),
    prisma.payout.groupBy({ by: ["creatorId", "status"], _sum: { amountKrw: true } }),
    prisma.creatorProfile.findMany({ select: { id: true, handle: true, displayName: true } }),
  ]);

  const balance = new Map<string, number>();
  for (const r of ledgerRows) {
    const amt = r._sum.amountKrw ?? 0;
    balance.set(r.accountId, (balance.get(r.accountId) ?? 0) + (r.direction === "CREDIT" ? amt : -amt));
  }
  const pending = new Map<string, number>();
  const paid = new Map<string, number>();
  for (const r of payoutRows) {
    if (!r.creatorId) continue; // host payouts are summarized separately
    const amt = r._sum.amountKrw ?? 0;
    if (r.status === "REQUESTED" || r.status === "APPROVED") pending.set(r.creatorId, (pending.get(r.creatorId) ?? 0) + amt);
    else if (r.status === "PAID") paid.set(r.creatorId, (paid.get(r.creatorId) ?? 0) + amt);
  }
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const ids = new Set<string>([...balance.keys(), ...pending.keys(), ...paid.keys()]);
  return [...ids]
    .map((id) => {
      const bal = balance.get(id) ?? 0;
      const pend = pending.get(id) ?? 0;
      const pd = paid.get(id) ?? 0;
      const prof = byId.get(id);
      return {
        id,
        handle: prof?.handle ?? id,
        displayName: prof?.displayName ?? "(unknown)",
        earnedKrw: bal + pd,
        availableKrw: bal - pend,
        pendingKrw: pend,
        paidOutKrw: pd,
      };
    })
    .filter((s) => s.earnedKrw > 0 || s.pendingKrw > 0 || s.paidOutKrw > 0)
    .sort((a, b) => b.earnedKrw - a.earnedKrw);
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

  const [kycQueue, reports, payouts, recentOrders, platformKrw, summaries, payoutHistory] = await Promise.all([
    prisma.creatorProfile.findMany({ where: { kycStatus: "PENDING" }, orderBy: { updatedAt: "asc" } }),
    prisma.report.findMany({ where: { status: "OPEN" }, include: { content: true }, orderBy: { createdAt: "asc" }, take: 20 }),
    prisma.payout.findMany({ where: { status: { in: ["REQUESTED", "APPROVED"] } }, include: { creator: true, host: true }, orderBy: { requestedAt: "asc" }, take: 20 }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { content: true } }),
    platformBalance(),
    creatorSummaries(),
    prisma.payout.findMany({ where: { status: { in: ["PAID", "REJECTED"] } }, include: { creator: true, host: true }, orderBy: [{ paidAt: "desc" }, { requestedAt: "desc" }], take: 10 }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-text">어드민</h1>
      <p className="numeric mt-1 text-sm text-text-muted">플랫폼 잔액 {formatKrw(platformKrw)}</p>

      {/* Revenue distribution per creator */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">수익 분배 · 크리에이터별</h2>
        <div className="overflow-hidden rounded-card border border-border">
          {summaries.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-muted">수익이 발생한 크리에이터가 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted">
                  <th className="px-4 py-2 text-left font-medium">크리에이터</th>
                  <th className="px-4 py-2 text-right font-medium">누적 수익</th>
                  <th className="px-4 py-2 text-right font-medium">가용</th>
                  <th className="px-4 py-2 text-right font-medium">대기</th>
                  <th className="px-4 py-2 text-right font-medium">정산 완료</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text">{s.displayName} <span className="numeric text-xs text-text-muted">@{s.handle}</span></td>
                    <td className="numeric px-4 py-2 text-right text-text">{formatKrw(s.earnedKrw)}</td>
                    <td className="numeric px-4 py-2 text-right text-accent">{formatKrw(s.availableKrw)}</td>
                    <td className="numeric px-4 py-2 text-right text-text-muted">{formatKrw(s.pendingKrw)}</td>
                    <td className="numeric px-4 py-2 text-right text-text-muted">{formatKrw(s.paidOutKrw)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

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
                  {(p.creator ?? p.host)?.displayName}
                  {p.host ? <span className="ml-1 text-xs text-accent">호스트</span> : null}{" "}
                  <span className="numeric text-accent">{formatKrw(p.amountKrw)}</span>
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

      {/* Payout history */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-muted">정산 내역</h2>
        <div className="overflow-hidden rounded-card border border-border">
          {payoutHistory.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-muted">정산 내역이 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {payoutHistory.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text">{(p.creator ?? p.host)?.displayName} <span className="numeric text-xs text-text-muted">@{(p.creator ?? p.host)?.handle}{p.host ? " · 호스트" : ""}</span></td>
                    <td className="numeric px-4 py-2 text-right text-text">{formatKrw(p.amountKrw)}</td>
                    <td className="numeric px-4 py-2 text-right text-xs text-text-muted">{p.status}</td>
                    <td className="numeric px-4 py-2 text-right text-xs text-text-muted">{(p.paidAt ?? p.requestedAt).toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
