"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input = "rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";

/** Uploads preview + original files via presigned PUT, then creates the content. */
export function UploadContentForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("IMAGE_SET");
  const [priceKrw, setPriceKrw] = useState(10000);
  const [preview, setPreview] = useState<File | null>(null);
  const [originals, setOriginals] = useState<File[]>([]);
  const [attestation, setAttestation] = useState({
    allParticipantsAdults: false,
    consentToDistribute: false,
    rightsOwned: false,
    noProhibitedContent: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function setAttested(key: keyof typeof attestation, value: boolean) {
    setAttestation((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadFile(file: File, kind: "preview" | "original"): Promise<string> {
    const res = await fetch("/api/studio/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, sizeBytes: file.size, kind }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "upload_url_failed");
    }
    const { key, url } = (await res.json()) as { key: string; url: string };
    const put = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!put.ok) throw new Error("s3_put_failed");
    return key;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const previewKey = preview ? await uploadFile(preview, "preview") : undefined;
      const assetKeys: string[] = [];
      for (const f of originals) assetKeys.push(await uploadFile(f, "original"));

      const res = await fetch("/api/studio/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, priceKrw, previewAssetKey: previewKey, assetKeys, attestation }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "create_failed");
      }
      setMsg("초안이 생성되었습니다. 아래 목록에서 발행하세요.");
      setTitle("");
      setPreview(null);
      setOriginals([]);
      setAttestation({
        allParticipantsAdults: false,
        consentToDistribute: false,
        rightsOwned: false,
        noProhibitedContent: false,
      });
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-text">콘텐츠 업로드</h3>
      <input className={input} placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="flex gap-3">
        <select className={`${input} flex-1`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="IMAGE_SET">IMAGE_SET</option>
          <option value="VIDEO">VIDEO</option>
          <option value="BUNDLE">BUNDLE</option>
        </select>
        <input
          className={`${input} w-32`}
          type="number"
          min={0}
          step={1000}
          value={priceKrw}
          onChange={(e) => setPriceKrw(Number(e.target.value))}
          placeholder="가격(KRW)"
        />
      </div>
      <label className="text-xs text-text-muted">
        미리보기(blur 처리될 파일)
        <input className="mt-1 block w-full text-xs" type="file" accept="image/*" onChange={(e) => setPreview(e.target.files?.[0] ?? null)} />
      </label>
      <label className="text-xs text-text-muted">
        원본 자산(여러 개)
        <input
          className="mt-1 block w-full text-xs"
          type="file"
          multiple
          accept="image/*,video/mp4"
          onChange={(e) => setOriginals(Array.from(e.target.files ?? []))}
        />
      </label>
      <div className="space-y-2 rounded-md border border-border bg-bg p-3 text-xs text-text-muted">
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={attestation.allParticipantsAdults}
            onChange={(e) => setAttested("allParticipantsAdults", e.target.checked)}
            required
          />
          모든 등장 인물은 성인이며 연령을 확인했습니다.
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={attestation.consentToDistribute}
            onChange={(e) => setAttested("consentToDistribute", e.target.checked)}
            required
          />
          촬영, 업로드, 판매 및 배포에 대한 명시적 동의를 확보했습니다.
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={attestation.rightsOwned}
            onChange={(e) => setAttested("rightsOwned", e.target.checked)}
            required
          />
          콘텐츠와 미리보기 자산의 권리를 보유하거나 적법하게 사용할 권한이 있습니다.
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={attestation.noProhibitedContent}
            onChange={(e) => setAttested("noProhibitedContent", e.target.checked)}
            required
          />
          콘텐츠 정책의 금지 콘텐츠에 해당하지 않습니다.
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? "업로드 중…" : "초안 생성"}
      </button>
      {msg ? <p className="text-xs text-text-muted">{msg}</p> : null}
    </form>
  );
}
