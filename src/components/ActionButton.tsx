"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Generic POST-and-refresh button for admin/studio actions. The browser adds
 * the Origin header on same-origin POSTs (the CSRF check), so we don't set it.
 */
export function ActionButton({
  url,
  body,
  label,
  variant = "ghost",
  confirmText,
}: {
  url: string;
  body?: unknown;
  label: string;
  variant?: "primary" | "ghost" | "danger";
  confirmText?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles: Record<string, string> = {
    primary: "bg-accent text-bg hover:bg-accent-hover",
    ghost: "border border-border text-text hover:border-accent",
    danger: "border border-border text-text-muted hover:border-accent hover:text-accent",
  };

  async function go() {
    if (confirmText && !window.confirm(confirmText)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "failed");
        return;
      }
      router.refresh();
    } catch {
      setError("network");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={go}
        disabled={loading}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${styles[variant]}`}
      >
        {loading ? "…" : label}
      </button>
      {error ? <span className="text-xs text-accent">{error}</span> : null}
    </span>
  );
}
