import { Prisma, type Order } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Domain error with a stable code the route layer maps to an HTTP status. */
export class OrderError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "OrderError";
  }
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export interface CreateOrderInput {
  buyerId: string;
  contentId: string;
  dropId?: string;
  /** From the `Idempotency-Key` header. Same key → same Order, always. */
  idempotencyKey: string;
}

/**
 * Creates (or returns the existing) PENDING order.
 *
 * Invariants:
 *  - the amount is ALWAYS read from Content.priceKrw on the server; any
 *    client-supplied amount is irrelevant (callers don't even pass one).
 *  - Drop stock is NOT reserved here — it is decremented only on PAID.
 *  - the same Idempotency-Key returns the same Order (unique constraint +
 *    P2002 fallback for the concurrent-first-request race).
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  const content = await prisma.content.findUnique({ where: { id: input.contentId } });
  if (!content) throw new OrderError("content_not_found");
  if (content.status !== "PUBLISHED") throw new OrderError("content_not_purchasable");

  if (input.dropId) {
    const drop = await prisma.drop.findUnique({ where: { id: input.dropId } });
    if (!drop || drop.contentId !== input.contentId) throw new OrderError("drop_invalid");
    if (drop.status !== "LIVE") throw new OrderError("drop_not_live");
    // Intentionally no stock reservation here.
  }

  try {
    return await prisma.order.create({
      data: {
        buyerId: input.buyerId,
        contentId: input.contentId,
        dropId: input.dropId ?? null,
        amountKrw: content.priceKrw, // authoritative, server-side
        status: "PENDING",
        idempotencyKey: input.idempotencyKey,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      const raced = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (raced) return raced;
    }
    throw e;
  }
}
