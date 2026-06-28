"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY = { email: "", handle: "", displayName: "", password: "" };

/** Admin-only: create a HOST account (login + ledger account + payouts). */
export function HostCreateForm() {
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/hosts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; handle?: string };
      if (!res.ok) throw new Error(j.error ?? "failed");
      setMsg(`호스트 생성됨: @${j.handle}`);
      setF(EMPTY);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface p-4">
      <input className={input} placeholder="이메일" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
      <input className={input} placeholder="핸들 (a-z0-9_)" value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value })} required />
      <input className={input} placeholder="표시 이름" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} required />
      <input className={input} placeholder="비밀번호 (8자+)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
      <div className="col-span-2 flex items-center justify-between">
        {msg ? <span className="text-xs text-text-muted">{msg}</span> : <span />}
        <button type="submit" disabled={busy} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50">
          호스트 생성
        </button>
      </div>
    </form>
  );
}
