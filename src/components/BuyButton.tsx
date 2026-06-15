"use client";

import { useState } from "react";
import { formatKrw } from "@/lib/money";

/**
 * Starts a purchase: POST /api/orders with a fresh Idempotency-Key, then
 * redirects to the provider checkout. Amount is decided server-side; this
 * component never sends or trusts a price.
 */
export function BuyButton({
  contentId,
  dropId,
  priceKrw,
  soldOut,
}: {
  contentId: string;
  dropId?: string;
  priceKrw: number;
  soldOut?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ contentId, dropId }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        const j = (await res.json()) as { error?: string };
        if (j.error === "age_verification_required") {
          window.location.href = `/age-gate?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "구매를 시작할 수 없습니다.");
        return;
      }

      const j = (await res.json()) as { redirectUrl: string };
      window.location.href = j.redirectUrl;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={buy}
        disabled={loading || soldOut}
        className="btn-accent w-full rounded-xl px-4 py-3 font-semibold disabled:cursor-not-allowed"
      >
        {soldOut ? "품절" : loading ? "처리 중…" : `${formatKrw(priceKrw)} 구매하기`}
      </button>
      {error ? <p className="mt-2 text-xs text-accent">{error}</p> : null}
    </div>
  );
}
