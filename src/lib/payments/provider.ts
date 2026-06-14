/**
 * Payment provider abstraction. Adult-category platforms cannot use Stripe and
 * must use a high-risk PSP (e.g. CCBill), so the provider is fully swappable.
 * The app only ever talks to this interface — never a concrete PSP directly.
 */

export type PaymentEventType = "PAID" | "FAILED" | "REFUNDED";

/** Provider-agnostic shape every webhook is normalized into. */
export interface NormalizedPaymentEvent {
  /** Provider's unique event id — the webhook idempotency key. */
  eventId: string;
  type: PaymentEventType;
  /** Our Order id (round-tripped through the checkout). */
  orderId: string;
  providerRef: string;
  /**
   * Amount the provider reports. NEVER used for ledger math — the order's
   * server-stored amount is authoritative. Present only for cross-checks.
   */
  amountKrw?: number;
}

export interface CreateCheckoutParams {
  orderId: string;
  amountKrw: number;
  buyerId: string;
}

export interface CreateCheckoutResult {
  redirectUrl: string;
  providerRef: string;
}

export interface PaymentProvider {
  readonly id: string;

  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;

  /** Verify the raw request body's signature. MUST run before parsing. */
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string>): boolean;

  /** Parse a verified raw body into a normalized event. Throws on malformed input. */
  parseWebhookEvent(rawBody: Buffer): NormalizedPaymentEvent;
}
