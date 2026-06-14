import type {
  PaymentProvider,
  NormalizedPaymentEvent,
  CreateCheckoutParams,
  CreateCheckoutResult,
} from "./provider";

/**
 * CCBill (high-risk PSP) — STUB ONLY. Implements the interface so the rest of
 * the app compiles against it, but the real integration points are left as
 * TODOs. Never put real CCBill keys in code; they come from env.
 *
 * Real integration notes:
 *  - createCheckout: build a CCBill FlexForms / RESTful API checkout URL using
 *    CCBILL_ACCOUNT_NUMBER / CCBILL_SUBACCOUNT; orderId goes in passthrough.
 *  - verifyWebhookSignature: CCBill posts a "dynamic pricing" digest (MD5 of
 *    fields + CCBILL_SALT). Recompute and compare.
 *  - parseWebhookEvent: map CCBill eventTypes (NewSaleSuccess / Refund / etc.)
 *    to PAID | FAILED | REFUNDED and extract our orderId from passthrough.
 */
export class CcbillProvider implements PaymentProvider {
  readonly id = "ccbill";

  async createCheckout(_params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    // TODO(ccbill): construct real FlexForms checkout URL.
    throw new Error("CcbillProvider.createCheckout not implemented");
  }

  verifyWebhookSignature(_rawBody: Buffer, _headers: Record<string, string>): boolean {
    // TODO(ccbill): recompute MD5 digest with CCBILL_SALT and compare.
    throw new Error("CcbillProvider.verifyWebhookSignature not implemented");
  }

  parseWebhookEvent(_rawBody: Buffer): NormalizedPaymentEvent {
    // TODO(ccbill): map CCBill event payload to NormalizedPaymentEvent.
    throw new Error("CcbillProvider.parseWebhookEvent not implemented");
  }
}
