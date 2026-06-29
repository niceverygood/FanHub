import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listNotifications, unreadCount } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Recent notifications + unread count for the signed-in user (drop-down + live badge). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ unread: 0, items: [] });
  const [items, unread] = await Promise.all([
    listNotifications(session.user.id, 12),
    unreadCount(session.user.id),
  ]);
  return NextResponse.json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
