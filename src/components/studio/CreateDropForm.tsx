"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input = "rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";

/** Creates a Drop on one of the creator's eligible (published, drop-less) contents. */
export function CreateDropForm({ contents }: { contents: { id: string; title: string }[] }) {
  const router = useRouter();
  const [contentId, setContentId] = useState(contents[0]?.id ?? "");
  const [totalSupply, setTotalSupply] = useState(50);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/studio/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          totalSupply,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "failed");
      }
      setMsg("Drop이 생성되었습니다.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (contents.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-4 text-xs text-text-muted">
        Drop을 만들려면 먼저 콘텐츠를 발행하세요.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-text">Drop 생성</h3>
      <select className={input} value={contentId} onChange={(e) => setContentId(e.target.value)}>
        {contents.map((c) => (
          <option key={c.id} value={c.id}>{c.title}</option>
        ))}
      </select>
      <input
        className={input}
        type="number"
        min={1}
        value={totalSupply}
        onChange={(e) => setTotalSupply(Number(e.target.value))}
        placeholder="총 수량"
      />
      <label className="text-xs text-text-muted">
        시작
        <input className={`${input} mt-1 block w-full`} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
      </label>
      <label className="text-xs text-text-muted">
        종료
        <input className={`${input} mt-1 block w-full`} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
      </label>
      <button type="submit" disabled={busy} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50">
        {busy ? "생성 중…" : "Drop 생성"}
      </button>
      {msg ? <p className="text-xs text-text-muted">{msg}</p> : null}
    </form>
  );
}
