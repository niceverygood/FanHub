import crypto from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import type {
  PaymentProvider,
  NormalizedPaymentEvent,
  CreateCheckoutParams,
  CreateCheckoutResult,
} from "./provider";

/**
 * Dev/test provider. Checkout redirects to /dev/checkout where success/fail
 * buttons simulate the PSP webhook. Webhooks are signed with HMAC-SHA256 over
 * the raw body using PAYMENT_WEBHOOK_SECRET.
 */
const SIGNATURE_HEADER = "x-mock-signature";

const eventSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum(["PAID", "FAILED", "REFUNDED"]),
  orderId: z.string().min(1),
  providerRef: z.string().min(1),
  amountKrw: z.number().int().nonnegative().optional(),
});

/** HMAC-SHA256 hex of the raw body. Exported for the dev simulator + tests. */
export function signMockPayload(rawBody: Buffer): string {
  return crypto.createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET).update(rawBody).digest("hex");
}

export class MockProvider implements PaymentProvider {
  readonly id = "mock";

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const providerRef = `mock_${params.orderId}`;
    const redirectUrl =
      `/dev/checkout?orderId=${encodeURIComponent(params.orderId)}` +
      `&ref=${encodeURIComponent(providerRef)}&amount=${params.amountKrw}`;
    return { providerRef, redirectUrl };
  }

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string>): boolean {
    const provided = headers[SIGNATURE_HEADER] ?? headers[SIGNATURE_HEADER.toLowerCase()];
    if (!provided) return false;
    const expected = signMockPayload(rawBody);
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  parseWebhookEvent(rawBody: Buffer): NormalizedPaymentEvent {
    const json: unknown = JSON.parse(rawBody.toString("utf8"));
    return eventSchema.parse(json);
  }
}
