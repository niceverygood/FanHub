import Link from "next/link";
import { auth } from "@/auth";
import { listNotifications } from "@/lib/notifications";
import { ActionButton } from "@/components/ActionButton";

export const dynamic = "force-dynamic";

function ago(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-text-muted">
        로그인이 필요합니다.
      </div>
    );
  }

  const items = await listNotifications(session.user.id, 50);
  const hasUnread = items.some((n) => n.readAt === null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text">알림</h1>
        {hasUnread ? (
          <ActionButton url="/api/notifications/read" body={{ all: true }} label="모두 읽음" />
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-8 rounded-card border border-border bg-surface p-10 text-center text-sm text-text-muted">
          알림이 없습니다.
        </p>
      ) : (
        <ul className="mt-6 overflow-hidden rounded-card border border-border">
          {items.map((n) => {
            const unread = n.readAt === null;
            const Row = (
              <div className={`flex gap-3 px-4 py-3.5 ${unread ? "bg-surface" : ""}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-accent" : "bg-transparent"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`truncate text-sm ${unread ? "font-semibold text-text" : "text-text-muted"}`}>
                      {n.title}
                    </span>
                    <span className="numeric shrink-0 text-xs text-text-muted">{ago(n.createdAt)}</span>
                  </div>
                  {n.body ? <p className="mt-0.5 truncate text-xs text-text-muted">{n.body}</p> : null}
                </div>
              </div>
            );
            return (
              <li key={n.id} className="border-b border-border last:border-0">
                {n.link ? (
                  <Link href={n.link} className="block transition-colors hover:bg-surface-elevated">
                    {Row}
                  </Link>
                ) : (
                  Row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
