import { env } from "@/lib/env";
import type {
  PaymentProvider,
  NormalizedPaymentEvent,
  CreateCheckoutParams,
  CreateCheckoutResult,
} from "./provider";
import { createOrder, verifyWebhook } from "./paypal";

/**
 * PayPal payment provider (Orders v2 + webhooks). Non-adult content only.
 * Buyer approves the order at PayPal → returns to /api/paypal/return which
 * captures it → the PAYMENT.CAPTURE.COMPLETED webhook is the authoritative PAID.
 */

/** Maps a PayPal webhook event_type to our normalized type (null = ignore). */
export function mapPayPalEvent(eventType: string): NormalizedPaymentEvent["type"] | null {
  switch (eventType) {
    case "PAYMENT.CAPTURE.COMPLETED":
      return "PAID";
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      return "FAILED";
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED":
      return "REFUNDED";
    default:
      return null;
  }
}

export class PayPalProvider implements PaymentProvider {
  readonly id = "paypal";

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const order = await createOrder({
      amountKrw: params.amountKrw,
      orderId: params.orderId,
      returnUrl: `${env.AUTH_URL}/api/paypal/return`,
      cancelUrl: `${env.AUTH_URL}/`,
    });
    return { redirectUrl: order.approveUrl, providerRef: `paypal_${order.id}` };
  }

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string>): Promise<boolean> {
    return verifyWebhook(headers, rawBody.toString("utf8"));
  }

  parseWebhookEvent(rawBody: Buffer): NormalizedPaymentEvent {
    const body = JSON.parse(rawBody.toString("utf8")) as {
      id?: string;
      event_type?: string;
      resource?: { id?: string; custom_id?: string; invoice_id?: string };
    };
    const type = mapPayPalEvent(body.event_type ?? "");
    if (!type) throw new Error(`unhandled PayPal event_type: ${body.event_type ?? "(none)"}`);
    const orderId = body.resource?.custom_id ?? body.resource?.invoice_id ?? "";
    const eventId = body.id ?? "";
    if (!orderId || !eventId) throw new Error("PayPal webhook missing orderId/event id");
    return { eventId, type, orderId, providerRef: `paypal_${body.resource?.id ?? orderId}` };
  }
}
