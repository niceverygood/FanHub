import { env } from "@/lib/env";

/**
 * PayPal REST helpers (Orders v2 for payment, Payouts v1 for settlement).
 * Non-adult content only — PayPal's AUP prohibits adult material. All keys come
 * from env; nothing works until PAYPAL_CLIENT_ID/SECRET are set.
 */

const BASE = () => (env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

// Currencies PayPal treats as having no decimal digits.
const ZERO_DECIMAL = new Set(["KRW", "JPY", "HUF", "TWD", "VND", "CLP", "BIF", "DJF", "GNF", "KMF", "MGA", "PYG", "RWF", "UGX", "VUV", "XAF", "XOF", "XPF"]);

export function paypalConfigured(): boolean {
  return !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET);
}

/** PayPal amount object. Amounts are integer KRW; for 0-decimal currencies the
 *  value is the whole number. Non-KRW currencies require an FX layer (not here). */
export function paypalAmount(amountKrw: number, currency: string = env.PAYPAL_CURRENCY) {
  const value = ZERO_DECIMAL.has(currency) ? String(Math.round(amountKrw)) : (Math.round(amountKrw) / 100).toFixed(2);
  return { currency_code: currency, value };
}

function requireConfig() {
  if (!paypalConfigured()) throw new Error("PayPal is not configured: set PAYPAL_CLIENT_ID and PAYPAL_SECRET");
}

async function accessToken(): Promise<string> {
  requireConfig();
  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`).toString("base64");
  const res = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error("PayPal auth: no access_token");
  return j.access_token;
}

/** Creates an Orders v2 order (intent CAPTURE). Returns the PayPal order id +
 *  the buyer approval URL. Our orderId is carried in custom_id/invoice_id. */
export async function createOrder(params: {
  amountKrw: number;
  orderId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; approveUrl: string }> {
  const token = await accessToken();
  const res = await fetch(`${BASE()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ custom_id: params.orderId, invoice_id: params.orderId, amount: paypalAmount(params.amountKrw) }],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        brand_name: "FanHub",
      },
    }),
  });
  if (!res.ok) throw new Error(`PayPal createOrder failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { id: string; links?: { rel: string; href: string }[] };
  const approve = j.links?.find((l) => l.rel === "approve")?.href;
  if (!approve) throw new Error("PayPal createOrder: no approve link");
  return { id: j.id, approveUrl: approve };
}

/** Captures an approved order (called from the return URL). The resulting
 *  PAYMENT.CAPTURE.COMPLETED webhook is the authoritative payment confirmation. */
export async function captureOrder(paypalOrderId: string): Promise<{ status: string }> {
  const token = await accessToken();
  const res = await fetch(`${BASE()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`PayPal capture failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { status?: string };
  return { status: j.status ?? "" };
}

/** Verifies a webhook via PayPal's verify-webhook-signature API. */
export async function verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<boolean> {
  if (!env.PAYPAL_WEBHOOK_ID || !paypalConfigured()) return false;
  const h = (k: string) => headers[k] ?? headers[k.toLowerCase()] ?? "";
  let token: string;
  try {
    token = await accessToken();
  } catch {
    return false;
  }
  const res = await fetch(`${BASE()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: h("paypal-auth-algo"),
      cert_url: h("paypal-cert-url"),
      transmission_id: h("paypal-transmission-id"),
      transmission_sig: h("paypal-transmission-sig"),
      transmission_time: h("paypal-transmission-time"),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!res.ok) return false;
  const j = (await res.json()) as { verification_status?: string };
  return j.verification_status === "SUCCESS";
}

/** Sends money to a recipient via Payouts v1. `senderBatchId` (= our payout id)
 *  makes the send idempotent — PayPal rejects a duplicate batch id. */
export async function sendPayout(params: {
  email: string;
  amountKrw: number;
  senderBatchId: string;
  note?: string;
}): Promise<{ batchId: string; status: string }> {
  const token = await accessToken();
  const res = await fetch(`${BASE()}/v1/payments/payouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: params.senderBatchId,
        email_subject: "FanHub 정산",
        email_message: params.note ?? "FanHub 정산이 지급되었습니다.",
      },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: params.email,
          amount: paypalAmount(params.amountKrw),
          note: params.note ?? "",
          sender_item_id: params.senderBatchId,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`PayPal payout failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { batch_header?: { payout_batch_id?: string; batch_status?: string } };
  return { batchId: j.batch_header?.payout_batch_id ?? "", status: j.batch_header?.batch_status ?? "" };
}
