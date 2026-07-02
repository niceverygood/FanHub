"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Comment composer. Refreshes the server-rendered list after posting. */
export function CommentForm({ contentId, loggedIn }: { contentId: string; loggedIn: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loggedIn) {
    return (
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-left text-sm text-text-muted transition-colors hover:border-accent"
      >
        로그인하고 댓글 남기기
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (res.status === 429) {
        setError("댓글을 너무 자주 작성했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      if (!res.ok) {
        setError("댓글 작성에 실패했습니다.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("댓글 작성에 실패했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          placeholder="댓글 남기기..."
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          게시
        </button>
      </div>
      {error ? <p className="text-xs text-accent">{error}</p> : null}
    </form>
  );
}
