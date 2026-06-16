"use client";

import { useState } from "react";

/**
 * Age-gate entry. Sets the verification cookie via a fetch POST, then hard-
 * navigates so middleware sees the new cookie. Using an explicit onClick avoids
 * the flaky native form-submit observed in some browsers.
 */
export function EnterButton({ next }: { next: string }) {
  const [loading, setLoading] = useState(false);

  async function enter() {
    setLoading(true);
    try {
      await fetch("/api/age-gate", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ next }).toString(),
      });
    } catch {
      // cookie may still be set; navigate regardless
    }
    window.location.assign(next || "/");
  }

  return (
    <button
      onClick={enter}
      disabled={loading}
      className="btn-accent w-full rounded-xl px-4 py-3 font-semibold"
    >
      {loading ? "입장 중…" : "만 19세 이상입니다 — 입장"}
    </button>
  );
}
