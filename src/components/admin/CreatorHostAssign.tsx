"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface HostOption {
  id: string;
  handle: string;
  displayName: string;
}

/** Admin-only: assign (or clear) the referring host for a creator. */
export function CreatorHostAssign({
  creatorId,
  hostId,
  hosts,
}: {
  creatorId: string;
  hostId: string | null;
  hosts: HostOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    setBusy(true);
    try {
      await fetch("/api/admin/link-host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, hostId: e.target.value }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      defaultValue={hostId ?? ""}
      onChange={change}
      disabled={busy}
      className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent disabled:opacity-50"
    >
      <option value="">— 호스트 없음 —</option>
      {hosts.map((h) => (
        <option key={h.id} value={h.id}>
          {h.displayName} (@{h.handle})
        </option>
      ))}
    </select>
  );
}
