"use client";

import { useEffect, useState } from "react";
import { gradientFor } from "@/lib/placeholder";

interface AssetsResponse {
  contentId: string;
  watermarkId: string;
  expiresInSeconds: number;
  urls: string[];
}

type ViewState = "loading" | "ok" | "nostorage" | "error";

/**
 * Owned-content viewer. Fetches short-lived signed URLs (entitlement-gated on
 * the server). Seed content has no real files, so each tile renders an abstract
 * gradient. When storage isn't configured (demo deploy), it still shows the
 * owned placeholders rather than an error.
 */
export function ContentViewer({ contentId }: { contentId: string }) {
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [state, setState] = useState<ViewState>("loading");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/content/${contentId}/assets`, { cache: "no-store" });
        if (res.status === 503) {
          setState("nostorage");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }
        setData((await res.json()) as AssetsResponse);
        setState("ok");
      } catch {
        setState("error");
      }
    })();
  }, [contentId]);

  if (state === "loading") return <p className="text-sm text-text-muted">불러오는 중…</p>;
  if (state === "error") return <p className="text-sm text-text-muted">열람 권한을 확인할 수 없습니다.</p>;

  // Storage not configured (demo): show owned placeholders.
  if (state === "nostorage") {
    return (
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-card border border-border"
              style={{ backgroundImage: gradientFor(`${contentId}-${i}`) }}
            />
          ))}
        </div>
        <p className="numeric mt-3 text-xs text-text-muted">
          보유 중 · 데모 환경(미디어 스토리지 미구성 — 실제 파일은 표시되지 않습니다)
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data && data.urls.length > 0 ? (
          data.urls.map((url, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-card border border-border"
              style={{ backgroundImage: gradientFor(`${contentId}-${i}`) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover opacity-0 transition-opacity"
                onLoad={(e) => (e.currentTarget.style.opacity = "1")}
              />
            </div>
          ))
        ) : (
          <p className="col-span-full text-sm text-text-muted">자산이 없습니다.</p>
        )}
      </div>
      {data ? (
        <p className="numeric mt-3 text-xs text-text-muted">
          워터마크 {data.watermarkId.slice(0, 10)}… · 서명 URL {data.expiresInSeconds}s 만료
        </p>
      ) : null}
    </div>
  );
}
