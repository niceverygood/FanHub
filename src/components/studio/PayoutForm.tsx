"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKrw } from "@/lib/money";

/** Requests a payout up to the available (ledger-derived) balance. */
export function PayoutForm({ availableKrw }: { availableKrw: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(Math.min(availableKrw, 10000));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/studio/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKrw: amount }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "failed");
      setMsg("정산이 신청되었습니다.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-text">정산 신청</h3>
      <p className="numeric text-xs text-text-muted">가용 잔액 {formatKrw(availableKrw)}</p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          type="number"
          min={1}
          max={availableKrw}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <button
          type="submit"
          disabled={busy || availableKrw <= 0}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
        >
          신청
        </button>
      </div>
      {msg ? <p className="text-xs text-text-muted">{msg}</p> : null}
    </form>
  );
}
