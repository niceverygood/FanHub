import type { Metadata } from "next";
import { Fraunces, Noto_Sans_KR, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Sidebar, type NavSession } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Avatar } from "@/components/ui/Avatar";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Noto_Sans_KR({ weight: ["400", "500", "700"], variable: "--font-sans", display: "swap", preload: false });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "FanHub — 크리에이터 콘텐츠 거래소",
  description: "한정 Drop · 실시간 크리에이터 차트 · 콘텐츠 거래소",
};

async function navSession(): Promise<NavSession> {
  const session = await auth();
  if (!session?.user) return { loggedIn: false, label: "게스트" };
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.user.id },
    select: { handle: true },
  });
  const label = profile?.handle
    ? `@${profile.handle}`
    : (session.user.email?.split("@")[0] ?? "내 계정");
  return { loggedIn: true, role: session.user.role, label };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nav = await navSession();
  return (
    <html lang="ko" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        {/* Global mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="font-display text-xl font-semibold text-text">FanHub</Link>
          {nav.loggedIn ? (
            <Link href="/library">
              <Avatar seed={nav.label} name={nav.label} size={32} />
            </Link>
          ) : (
            <Link href="/login" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg">
              로그인
            </Link>
          )}
        </header>

        <div className="mx-auto flex w-full max-w-[1280px]">
          <Sidebar session={nav} />
          <main className="min-h-screen min-w-0 flex-1 border-border pb-24 lg:border-x lg:pb-0">{children}</main>
        </div>
        <MobileNav session={nav} />
      </body>
    </html>
  );
}
