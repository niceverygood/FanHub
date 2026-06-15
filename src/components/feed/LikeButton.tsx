"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

/**
 * Cosmetic like control (no backend) — gives the feed an Instagram-like feel.
 * Seeded initial count so cards don't all show the same number.
 */
export function LikeButton({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const base = (Math.abs(h) % 900) + 12;

  const [liked, setLiked] = useState(false);

  return (
    <button
      onClick={() => setLiked((v) => !v)}
      className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      aria-pressed={liked}
    >
      <Heart
        size={22}
        className={liked ? "text-accent" : ""}
        fill={liked ? "currentColor" : "none"}
        strokeWidth={2}
      />
      <span className="numeric">{(base + (liked ? 1 : 0)).toLocaleString()}</span>
    </button>
  );
}
