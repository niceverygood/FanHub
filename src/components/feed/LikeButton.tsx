"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

export interface LikeButtonProps {
  contentId: string;
  initialCount: number;
  initialLiked: boolean;
  loggedIn: boolean;
}

/** Real like toggle backed by POST /api/content/[id]/like (optimistic UI). */
export function LikeButton({ contentId, initialCount, initialLiked, loggedIn }: LikeButtonProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    if (pending) return;
    setPending(true);
    // Optimistic flip; the server response is authoritative.
    const prev = { liked, count };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));
    try {
      const res = await fetch(`/api/content/${contentId}/like`, { method: "POST" });
      if (!res.ok) throw new Error("like_failed");
      const data = (await res.json()) as { liked: boolean; count: number };
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      setLiked(prev.liked);
      setCount(prev.count);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      aria-pressed={liked}
      aria-label="좋아요"
    >
      <Heart
        size={22}
        className={liked ? "text-accent" : ""}
        fill={liked ? "currentColor" : "none"}
        strokeWidth={2}
      />
      <span className="numeric">{count.toLocaleString()}</span>
    </button>
  );
}
