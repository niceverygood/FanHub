"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, BarChart3, Bookmark, User } from "lucide-react";
import type { NavSession } from "./Sidebar";

const ITEMS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/drops", label: "Drops", icon: Zap },
  { href: "/chart", label: "차트", icon: BarChart3 },
  { href: "/library", label: "보관함", icon: Bookmark },
];

/** Instagram-style bottom tab bar for small screens. */
export function MobileNav({ session }: { session: NavSession }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-bg/95 px-2 py-2 backdrop-blur lg:hidden">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const active = isActive(it.href);
        return (
          <Link key={it.href} href={it.href} className="flex flex-1 flex-col items-center gap-0.5 py-1">
            <Icon size={22} className={active ? "text-accent" : "text-text-muted"} strokeWidth={active ? 2.4 : 2} />
            <span className={`text-[10px] ${active ? "text-text" : "text-text-muted"}`}>{it.label}</span>
          </Link>
        );
      })}
      <Link href={session.loggedIn ? "/library" : "/login"} className="flex flex-1 flex-col items-center gap-0.5 py-1">
        <User size={22} className="text-text-muted" />
        <span className="text-[10px] text-text-muted">{session.loggedIn ? "프로필" : "로그인"}</span>
      </Link>
    </nav>
  );
}
