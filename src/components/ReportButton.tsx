"use client";

import { useState } from "react";

/** Minimal content-report control (logged-in users). */
export function ReportButton({ contentId }: { contentId: string }) {
  const [done, setDone] = useState(false);

  async function report() {
    const reason = window.prompt("신고 사유를 입력하세요");
    if (!reason) return;
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, reason }),
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (res.ok) setDone(true);
  }

  return (
    <button onClick={report} disabled={done} className="text-xs text-text-muted underline-offset-2 hover:text-accent hover:underline">
      {done ? "신고 접수됨" : "신고"}
    </button>
  );
}
