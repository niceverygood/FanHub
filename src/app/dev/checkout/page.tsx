import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatKrw } from "@/lib/money";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * DEV ONLY mock checkout. Stands in for the PSP-hosted payment page; the two
 * buttons make /api/dev/pay post a signed webhook to simulate the outcome.
 */
export default async function DevCheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const orderId = typeof searchParams.orderId === "string" ? searchParams.orderId : "";
  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId }, include: { content: true } })
    : null;

  if (!order) notFound();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-wider text-text-muted">Mock Checkout (dev)</p>
        <h1 className="mt-2 font-display text-xl text-text">{order.content?.title}</h1>
        <p className="mt-1 text-sm text-text-muted">주문 {order.id}</p>
        <p className="numeric mt-4 text-2xl text-accent">{formatKrw(order.amountKrw)}</p>

        <div className="mt-6 flex gap-3">
          <form action="/api/dev/pay" method="post" className="flex-1">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="outcome" value="PAID" />
            <button className="w-full rounded-md bg-accent px-4 py-2 font-medium text-bg hover:bg-accent-hover">
              결제 성공
            </button>
          </form>
          <form action="/api/dev/pay" method="post" className="flex-1">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="outcome" value="FAILED" />
            <button className="w-full rounded-md border border-border px-4 py-2 text-text hover:border-accent">
              결제 실패
            </button>
          </form>
        </div>
        <p className="mt-4 text-xs text-text-muted">
          진실의 원천은 웹훅입니다. 이 버튼은 서명된 웹훅을 전송할 뿐, 클라이언트 리다이렉트가
          권한을 부여하지 않습니다.
        </p>
      </div>
    </div>
  );
}
