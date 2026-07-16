import Link from "next/link";
import { mailto, siteConfig } from "@/lib/site";

interface PolicyPageProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PolicyPage({ eyebrow, title, description, children }: PolicyPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-text">{title}</h1>
      <p className="mt-4 text-sm leading-6 text-text-muted">{description}</p>
      <p className="mt-3 text-xs text-text-muted">최종 업데이트: {siteConfig.updatedAt}</p>
      <div className="mt-8 space-y-8">{children}</div>
      <ContactPanel />
    </div>
  );
}

export function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface/60 p-5">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-text-muted">{children}</div>
    </section>
  );
}

export function PolicyList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ContactPanel() {
  return (
    <section className="mt-10 rounded-card border border-border bg-bg p-5 text-sm text-text-muted">
      <h2 className="font-semibold text-text">문의 및 신고</h2>
      <p className="mt-2">
        일반 문의는{" "}
        <Link className="text-accent hover:underline" href={mailto(siteConfig.supportEmail, "FanHub 문의")}>
          {siteConfig.supportEmail}
        </Link>
        , 법무/권리 요청은{" "}
        <Link className="text-accent hover:underline" href={mailto(siteConfig.legalEmail, "FanHub 권리 요청")}>
          {siteConfig.legalEmail}
        </Link>
        , 안전 신고는{" "}
        <Link className="text-accent hover:underline" href={mailto(siteConfig.safetyEmail, "FanHub 안전 신고")}>
          {siteConfig.safetyEmail}
        </Link>
        로 접수합니다.
      </p>
    </section>
  );
}
