"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FollowButtonProps {
  handle: string;
  initialFollowing: boolean;
  initialCount: number;
  loggedIn: boolean;
  /** Hide the button for the creator's own profile. */
  self?: boolean;
}

/** Follow/unfollow toggle backed by POST /api/creators/[handle]/follow. */
export function FollowButton({ handle, initialFollowing, initialCount, loggedIn, self }: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  if (self) return null;

  const toggle = async () => {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    if (pending) return;
    setPending(true);
    const prev = { following, count };
    setFollowing(!following);
    setCount(count + (following ? -1 : 1));
    try {
      const res = await fetch(`/api/creators/${handle}/follow`, { method: "POST" });
      if (!res.ok) throw new Error("follow_failed");
      const data = (await res.json()) as { following: boolean; count: number };
      setFollowing(data.following);
      setCount(data.count);
    } catch {
      setFollowing(prev.following);
      setCount(prev.count);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        following
          ? "border border-border text-text hover:border-accent"
          : "bg-accent text-bg hover:bg-accent-hover"
      }`}
    >
      {following ? "팔로잉" : "팔로우"}
    </button>
  );
}
