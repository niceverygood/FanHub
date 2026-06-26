"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, BarChart3, Bookmark, Store, Shield, LogIn, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";

type Role = "FAN" | "CREATOR" | "ADMIN" | "HOST";

export interface NavSession {
  loggedIn: boolean;
  role?: Role;
  label: string;
}

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const BASE_ITEMS: Item[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/drops", label: "Drops", icon: Zap },
  { href: "/chart", label: "차트", icon: BarChart3 },
  { href: "/library", label: "보관함", icon: Bookmark },
];

const ROLE_LABEL: Record<Role, string> = { FAN: "팬", CREATOR: "크리에이터", ADMIN: "관리자", HOST: "호스트" };

export function Sidebar({ session }: { session: NavSession }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const items = [...BASE_ITEMS];
  if (session.role === "CREATOR" || session.role === "ADMIN") {
    items.push({ href: "/studio", label: "스튜디오", icon: Store });
  }
  if (session.role === "ADMIN") items.push({ href: "/admin", label: "어드민", icon: Shield });

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border px-3 py-5 lg:flex">
      <Link href="/" className="px-3 pb-7">
        <Logo className="text-2xl" />
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-4 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                active ? "bg-surface font-semibold text-text" : "text-text-muted hover:bg-surface/60 hover:text-text"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} className={active ? "text-accent" : ""} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        {session.loggedIn ? (
          <Link href="/library" className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface/60">
            <Avatar seed={session.label} name={session.label} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-sm text-text">{session.label}</span>
              <span className="block text-xs text-text-muted">
                {session.role ? ROLE_LABEL[session.role] : "팬"}
              </span>
            </span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 font-medium text-bg transition-colors hover:bg-accent-hover"
          >
            <LogIn size={18} /> 로그인
          </Link>
        )}
      </div>
    </aside>
  );
}
