"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatKrw } from "@/lib/money";
import { gradientFor } from "@/lib/placeholder";

interface DropCardProps {
  dropId: string;
  contentId: string;
  title: string;
  handle: string;
  priceKrw: number;
  remaining: number;
  totalSupply: number;
  status: string;
  startsAt: string;
  endsAt: string;
}

function countdown(targetMs: number): string {
  const diff = targetMs - Date.now();
  if (diff <= 0) return "00:00:00";
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return d > 0 ? `${d}d ${h}:${m}:${sec}` : `${h}:${m}:${sec}`;
}

/** SSR-rendered, then polls remaining/status + ticks the countdown locally. */
export function DropCard(props: DropCardProps) {
  const [remaining, setRemaining] = useState(props.remaining);
  const [status, setStatus] = useState(props.status);
  const [, setNow] = useState(0); // tick to re-render the countdown

  const scheduled = status === "SCHEDULED";
  const target = new Date(scheduled ? props.startsAt : props.endsAt).getTime();

  useEffect(() => {
    const tick = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/drops?ids=${props.dropId}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          drops: { id: string; remaining: number; status: string }[];
        };
        const d = json.drops.find((x) => x.id === props.dropId);
        if (d) {
          setRemaining(d.remaining);
          setStatus(d.status);
        }
      } catch {
        // keep last known
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [props.dropId]);

  const pct = props.totalSupply > 0 ? Math.round((remaining / props.totalSupply) * 100) : 0;
  const soldOut = status === "SOLD_OUT" || remaining <= 0;

  return (
    <Link
      href={`/content/${props.contentId}`}
      className="flex flex-col overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-accent-muted"
    >
      <div className="relative aspect-[16/9]">
        <div className="absolute inset-0 blur-[2px]" style={{ backgroundImage: gradientFor(props.contentId) }} />
        <div className="lock-overlay flex-col gap-1">
          <span className="numeric text-xs uppercase tracking-wider text-text-muted">
            {scheduled ? "시작까지" : soldOut ? "종료" : "남은 시간"}
          </span>
          {!soldOut ? (
            <span className="numeric text-lg text-text">{countdown(target)}</span>
          ) : (
            <span className="numeric text-lg text-accent">SOLD OUT</span>
          )}
        </div>
      </div>

      <div className="p-4">
        <p className="truncate text-sm text-text">{props.title}</p>
        <p className="truncate text-xs text-text-muted">@{props.handle}</p>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="numeric text-xs text-text-muted">
            {remaining}/{props.totalSupply} 남음
          </span>
          <span className="numeric text-sm text-accent">{formatKrw(props.priceKrw)}</span>
        </div>
      </div>
    </Link>
  );
}
