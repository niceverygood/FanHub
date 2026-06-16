import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Sidebar, type NavSession } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
// Pretendard variable — premium Korean web font (self-hosted, all weights).
const sans = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});
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
          <Link href="/"><Logo className="text-xl" /></Link>
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
