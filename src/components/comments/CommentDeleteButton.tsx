"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/** Deletes a comment (author / creator / admin — enforced server-side). */
export function CommentDeleteButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const remove = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label="댓글 삭제"
      className="text-text-muted transition-colors hover:text-accent disabled:opacity-50"
    >
      <X size={14} />
    </button>
  );
}
