import crypto from "node:crypto";
import { env } from "@/lib/env";
import type {
  PaymentProvider,
  NormalizedPaymentEvent,
  CreateCheckoutParams,
  CreateCheckoutResult,
} from "./provider";

/**
 * CCBill (high-risk / adult-category PSP) provider.
 *
 * Sandbox-ready: implements the real CCBill FlexForms + webhook protocol, but
 * all credentials come from env (CCBILL_*). It throws loudly if selected
 * (PAYMENT_PROVIDER=ccbill) without keys, so the demo stays on MockProvider
 * until a real merchant account is configured. No real keys live in code.
 *
 * ⚠️ CCBill field names / digest config vary per merchant account setup. The
 * formulas below follow CCBill's documented "dynamic pricing" scheme; confirm
 * the exact field set against your account's FlexForms + Webhooks settings.
 */

const FLEXFORMS_BASE = "https://api.ccbill.com/wap-frontflex/flexforms";
// Access period CCBill records for the charge (days). Our Entitlement is
// permanent regardless — this only affects CCBill's own bookkeeping.
const INITIAL_PERIOD_DAYS = "30";

const md5 = (s: string) => crypto.createHash("md5").update(s, "utf8").digest("hex");

/** CCBill dynamic-pricing digest: MD5(price + period + currency + salt). */
export function ccbillDigest(price: string, period: string, currency: string, salt: string): string {
  return md5(`${price}${period}${currency}${salt}`);
}

/** CCBill bills with a 2-decimal price string (e.g. KRW 9000 → "9000.00"). */
export function ccbillPrice(amountKrw: number): string {
  return amountKrw.toFixed(2);
}

const EVENT_MAP: Record<string, NormalizedPaymentEvent["type"]> = {
  NewSaleSuccess: "PAID",
  RenewalSuccess: "PAID",
  NewSaleFailure: "FAILED",
  Refund: "REFUNDED",
  Chargeback: "REFUNDED",
  Void: "REFUNDED",
};

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function requireKeys(): { accnum: string; subacc: string; salt: string; flexId: string; currency: string } {
  const accnum = env.CCBILL_ACCOUNT_NUMBER;
  const subacc = env.CCBILL_SUBACCOUNT;
  const salt = env.CCBILL_SALT;
  const flexId = env.CCBILL_FLEXFORM_ID;
  const currency = env.CCBILL_CURRENCY_CODE;
  if (!accnum || !subacc || !salt || !flexId) {
    throw new Error(
      "CCBill is not configured: set CCBILL_ACCOUNT_NUMBER, CCBILL_SUBACCOUNT, CCBILL_SALT, CCBILL_FLEXFORM_ID",
    );
  }
  return { accnum, subacc, salt, flexId, currency };
}

export class CcbillProvider implements PaymentProvider {
  readonly id = "ccbill";

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const { accnum, subacc, salt, flexId, currency } = requireKeys();
    const price = ccbillPrice(params.amountKrw);
    const formDigest = ccbillDigest(price, INITIAL_PERIOD_DAYS, currency, salt);

    const qs = new URLSearchParams({
      clientAccnum: accnum,
      clientSubacc: subacc,
      initialPrice: price,
      initialPeriod: INITIAL_PERIOD_DAYS,
      currencyCode: currency,
      formDigest,
      orderId: params.orderId, // passthrough → echoed back in the webhook
    });
    return {
      redirectUrl: `${FLEXFORMS_BASE}/${flexId}?${qs.toString()}`,
      providerRef: `ccbill_${params.orderId}`, // CCBill assigns its own ref; finalized on webhook
    };
  }

  verifyWebhookSignature(rawBody: Buffer, _headers: Record<string, string>): boolean {
    const salt = env.CCBILL_SALT;
    if (!salt) return false;
    const f = Object.fromEntries(new URLSearchParams(rawBody.toString("utf8")));
    const provided = f["dynamicPricingValidationDigest"];
    if (!provided) return false;
    const price = f["billedInitialPrice"] ?? f["initialPrice"] ?? "";
    const period = f["initialPeriod"] ?? INITIAL_PERIOD_DAYS;
    const currency = f["currencyCode"] ?? env.CCBILL_CURRENCY_CODE;
    const expected = ccbillDigest(price, period, currency, salt);
    return timingSafeEqualStr(provided, expected);
  }

  parseWebhookEvent(rawBody: Buffer): NormalizedPaymentEvent {
    const f = Object.fromEntries(new URLSearchParams(rawBody.toString("utf8")));
    const type = EVENT_MAP[f["eventType"] ?? ""];
    if (!type) throw new Error(`unknown CCBill eventType: ${f["eventType"] ?? "(none)"}`);
    const orderId = f["orderId"] ?? f["X-orderId"] ?? "";
    const eventId = f["transactionId"] ?? f["subscriptionId"] ?? "";
    if (!orderId || !eventId) throw new Error("CCBill webhook missing orderId/transactionId");
    const priceStr = f["billedInitialPrice"] ?? f["accountingInitialPrice"] ?? f["initialPrice"];
    const amountKrw = priceStr ? Math.round(Number(priceStr)) : undefined;
    return { eventId, type, orderId, providerRef: `ccbill_${orderId}`, amountKrw };
  }
}
