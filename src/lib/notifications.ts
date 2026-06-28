import { prisma } from "@/lib/prisma";

export interface NotifyInput {
  userId: string;
  type: string; // sale | payout | kyc | host_commission | report | admin_*
  title: string;
  body?: string;
  link?: string;
}

/**
 * In-app notifications. All writes are BEST-EFFORT — a notification failure must
 * never break the domain flow that triggered it, and notifications are never
 * written inside a money transaction.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId: input.userId, type: input.type, title: input.title, body: input.body, link: input.link },
    });
  } catch {
    // non-critical
  }
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  const data = inputs.filter((i) => i.userId);
  if (data.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: data.map((i) => ({ userId: i.userId, type: i.type, title: i.title, body: i.body, link: i.link })),
    });
  } catch {
    // non-critical
  }
}

/** Notify every admin (queue events). */
export async function notifyAdmins(input: Omit<NotifyInput, "userId">): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await notifyMany(admins.map((a) => ({ ...input, userId: a.id })));
  } catch {
    // non-critical
  }
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string, limit = 30) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
}

/** Marks notifications read. Pass {all:true} or specific ids. Returns count updated. */
export async function markRead(userId: string, opts: { ids?: string[]; all?: boolean }): Promise<number> {
  const where = opts.all
    ? { userId, readAt: null }
    : { userId, id: { in: opts.ids ?? [] }, readAt: null };
  const res = await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
  return res.count;
}
