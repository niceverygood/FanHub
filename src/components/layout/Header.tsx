import Link from "next/link";
import { auth } from "@/auth";

const NAV = [
  { href: "/", label: "탐색" },
  { href: "/drops", label: "Drops" },
  { href: "/chart", label: "차트" },
];

export async function Header() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-text">
          FanHub
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              {role === "CREATOR" || role === "ADMIN" ? (
                <Link href="/studio" className="text-text-muted hover:text-text">
                  스튜디오
                </Link>
              ) : null}
              {role === "ADMIN" ? (
                <Link href="/admin" className="text-text-muted hover:text-text">
                  어드민
                </Link>
              ) : null}
              <Link href="/library" className="text-text-muted hover:text-text">
                보관함
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-bg transition-colors hover:bg-accent-hover"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
