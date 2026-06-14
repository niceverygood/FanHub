import { Prisma } from "@prisma/client";
import { ulid } from "ulid";
import { prisma } from "@/lib/prisma";
import { getCreatorShareBps } from "@/lib/settings";
import { maskObject } from "@/lib/log";
import { getPaymentProvider } from "./index";
import { recordPurchaseLedger, recordRefundReversal } from "./ledger";
import type { NormalizedPaymentEvent } from "./provider";

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export interface ProcessResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Entry point for the webhook route. Pure (no NextResponse) so it is directly
 * unit-testable. Order of operations is critical:
 *   1. verify signature on the RAW body — before any parsing
 *   2. parse
 *   3. dedup + process (single transaction)
 */
export async function verifyAndProcess(
  rawBody: Buffer,
  headers: Record<string, string>,
): Promise<ProcessResult> {
  const provider = getPaymentProvider();

  if (!provider.verifyWebhookSignature(rawBody, headers)) {
    // 401 and NOTHING else happens — no DB read/write.
    return { status: 401, body: { error: "invalid_signature" } };
  }

  let event: NormalizedPaymentEvent;
  try {
    event = provider.parseWebhookEvent(rawBody);
  } catch {
    return { status: 400, body: { error: "invalid_payload" } };
  }

  try {
    const outcome = await handlePaymentEvent(event, provider.id);
    return { status: 200, body: outcome };
  } catch {
    // Provider will retry; we never leak payload contents.
    return { status: 500, body: { error: "processing_failed" } };
  }
}

/**
 * Dedup-then-dispatch. The WebhookEvent insert is the idempotency lock: only
 * the first insert of an eventId proceeds; duplicates short-circuit. The
 * conditional Order update inside each handler is a second line of defense.
 */
export async function handlePaymentEvent(
  event: NormalizedPaymentEvent,
  providerId = "mock",
): Promise<Record<string, unknown>> {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: providerId,
        eventId: event.eventId,
        payload: maskObject(event) as Prisma.InputJsonValue,
        status: "RECEIVED",
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      const existing = await prisma.webhookEvent.findUnique({
        where: { eventId: event.eventId },
      });
      return { deduplicated: true, eventStatus: existing?.status ?? "RECEIVED" };
    }
    throw e;
  }

  try {
    const outcome = await dispatch(event);
    await prisma.webhookEvent.update({
      where: { eventId: event.eventId },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return { deduplicated: false, ...outcome };
  } catch (e) {
    await prisma.webhookEvent
      .update({ where: { eventId: event.eventId }, data: { status: "FAILED" } })
      .catch(() => undefined);
    throw e;
  }
}

async function dispatch(event: NormalizedPaymentEvent): Promise<Record<string, unknown>> {
  switch (event.type) {
    case "PAID":
      return processPaid(event);
    case "FAILED":
      return processFailed(event);
    case "REFUNDED":
      return refundOrder(event.orderId);
  }
}

/**
 * PAID: a single transaction that conditionally promotes the order, decrements
 * Drop stock with a raw conditional UPDATE, writes the double-entry ledger, and
 * grants the Entitlement. A sold-out race fails the order and triggers a refund
 * (no Entitlement, no purchase ledger).
 */
export async function processPaid(
  event: NormalizedPaymentEvent,
): Promise<Record<string, unknown>> {
  const creatorShareBps = await getCreatorShareBps();

  const outcome = await prisma.$transaction(async (tx) => {
    // a. PENDING -> PAID (conditional). 0 rows ⇒ already processed / not pending.
    const promoted = await tx.order.updateMany({
      where: { id: event.orderId, status: "PENDING" },
      data: { status: "PAID", providerRef: event.providerRef },
    });
    if (promoted.count === 0) {
      return { outcome: "skipped_not_pending", orderId: event.orderId };
    }

    const order = await tx.order.findUnique({
      where: { id: event.orderId },
      include: { content: true },
    });
    if (!order || !order.content) throw new Error("order_not_found_after_promote");

    // b. Drop stock: conditional decrement (never read-then-write).
    if (order.dropId) {
      const affected = await tx.$executeRaw`
        UPDATE "Drop" SET remaining = remaining - 1, "updatedAt" = now()
        WHERE id = ${order.dropId} AND remaining > 0`;
      if (affected === 0) {
        // Sold-out race: undo the PAID promotion, fail, trigger refund.
        await tx.order.updateMany({
          where: { id: order.id, status: "PAID" },
          data: { status: "FAILED" },
        });
        await tx.auditLog.create({
          data: {
            actorId: order.buyerId,
            action: "order_failed_soldout",
            targetType: "Order",
            targetId: order.id,
            meta: { dropId: order.dropId },
          },
        });
        return { outcome: "sold_out", orderId: order.id, refundTriggered: true };
      }
      // Flip to SOLD_OUT when stock hits zero.
      await tx.$executeRaw`
        UPDATE "Drop" SET status = 'SOLD_OUT'
        WHERE id = ${order.dropId} AND remaining = 0 AND status = 'LIVE'`;
    }

    // c. Double-entry ledger.
    await recordPurchaseLedger(tx, {
      orderId: order.id,
      amountKrw: order.amountKrw,
      creatorAccountId: order.content.creatorId,
      creatorShareBps,
    });

    // d. Entitlement (the only basis for content access). watermarkId = ULID.
    await tx.entitlement.create({
      data: {
        buyerId: order.buyerId,
        contentId: order.contentId,
        orderId: order.id,
        watermarkId: ulid(),
      },
    });

    // e. Audit.
    await tx.auditLog.create({
      data: {
        actorId: order.buyerId,
        action: "order_paid",
        targetType: "Order",
        targetId: order.id,
        meta: { amountKrw: order.amountKrw },
      },
    });

    return { outcome: "paid", orderId: order.id };
  });

  if (outcome.outcome === "sold_out") {
    await initiateExternalRefund(event.orderId, event.providerRef, "sold_out");
  }
  return outcome;
}

/** FAILED at the provider before capture: just fail the pending order. */
export async function processFailed(
  event: NormalizedPaymentEvent,
): Promise<Record<string, unknown>> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: event.orderId } });
    const failed = await tx.order.updateMany({
      where: { id: event.orderId, status: "PENDING" },
      data: { status: "FAILED" },
    });
    if (failed.count === 0) return { outcome: "skipped_not_pending", orderId: event.orderId };
    await tx.auditLog.create({
      data: {
        actorId: order?.buyerId ?? null,
        action: "order_failed",
        targetType: "Order",
        targetId: event.orderId,
        meta: {},
      },
    });
    return { outcome: "failed", orderId: event.orderId };
  });
}

/**
 * Refund: conditional PAID -> REFUNDED, append reversing ledger entries, revoke
 * the Entitlement. Append-only — originals are never touched.
 */
export async function refundOrder(orderId: string): Promise<Record<string, unknown>> {
  return prisma.$transaction(async (tx) => {
    const refunded = await tx.order.updateMany({
      where: { id: orderId, status: "PAID" },
      data: { status: "REFUNDED" },
    });
    if (refunded.count === 0) return { outcome: "skipped_not_paid", orderId };

    const order = await tx.order.findUnique({ where: { id: orderId } });
    await recordRefundReversal(tx, orderId);
    await tx.entitlement.updateMany({
      where: { orderId },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId: order?.buyerId ?? null,
        action: "order_refunded",
        targetType: "Order",
        targetId: orderId,
        meta: {},
      },
    });
    return { outcome: "refunded", orderId };
  });
}

/**
 * Sold-out refund of an already-captured payment. The PaymentProvider interface
 * intentionally has no refund method yet, so this records intent for an async
 * worker / manual reconciliation.
 * TODO(payments): call provider refund API once added to the interface.
 */
async function initiateExternalRefund(
  orderId: string,
  providerRef: string,
  reason: string,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: "refund_triggered",
      targetType: "Order",
      targetId: orderId,
      meta: { providerRef, reason },
    },
  });
}
