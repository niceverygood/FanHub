"use client";

import { useEffect, useState } from "react";
import { gradientFor } from "@/lib/placeholder";

interface AssetsResponse {
  contentId: string;
  watermarkId: string;
  expiresInSeconds: number;
  urls: string[];
}

/**
 * Owned-content viewer. Fetches short-lived signed URLs (entitlement-gated on
 * the server). Seed content has no real files, so each tile renders an abstract
 * gradient and attempts the signed image on top, falling back gracefully.
 */
export function ContentViewer({ contentId }: { contentId: string }) {
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/content/${contentId}/assets`, { cache: "no-store" });
        if (!res.ok) {
          setError("열람 권한을 확인할 수 없습니다.");
          return;
        }
        setData((await res.json()) as AssetsResponse);
      } catch {
        setError("자산을 불러오지 못했습니다.");
      }
    })();
  }, [contentId]);

  if (error) return <p className="text-sm text-text-muted">{error}</p>;
  if (!data) return <p className="text-sm text-text-muted">불러오는 중…</p>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.urls.length === 0 ? (
          <p className="col-span-full text-sm text-text-muted">자산이 없습니다.</p>
        ) : (
          data.urls.map((url, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-card border border-border"
              style={{ backgroundImage: gradientFor(`${contentId}-${i}`) }}
            >
              {/* Real media would render here; seed assets have no file. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover opacity-0 transition-opacity"
                onLoad={(e) => (e.currentTarget.style.opacity = "1")}
              />
            </div>
          ))
        )}
      </div>
      <p className="numeric mt-3 text-xs text-text-muted">
        워터마크 {data.watermarkId.slice(0, 10)}… · 서명 URL {data.expiresInSeconds}s 만료
      </p>
    </div>
  );
}
