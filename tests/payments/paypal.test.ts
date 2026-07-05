import { describe, it, expect } from "vitest";
import { paypalAmount, paypalConfigured } from "@/lib/payments/paypal";
import { PayPalProvider, mapPayPalEvent } from "@/lib/payments/paypal-provider";

const buf = (o: unknown) => Buffer.from(JSON.stringify(o), "utf8");

describe("PayPalProvider", () => {
  it("formats zero-decimal currency amounts with no fraction", () => {
    expect(paypalAmount(9000, "KRW")).toEqual({ currency_code: "KRW", value: "9000" });
    expect(paypalAmount(12000, "JPY")).toEqual({ currency_code: "JPY", value: "12000" });
  });

  it("maps webhook event types", () => {
    expect(mapPayPalEvent("PAYMENT.CAPTURE.COMPLETED")).toBe("PAID");
    expect(mapPayPalEvent("PAYMENT.CAPTURE.DENIED")).toBe("FAILED");
    expect(mapPayPalEvent("PAYMENT.CAPTURE.REFUNDED")).toBe("REFUNDED");
    expect(mapPayPalEvent("BILLING.SUBSCRIPTION.CREATED")).toBeNull();
  });

  it("parses a capture-completed webhook and extracts our orderId (custom_id)", () => {
    const p = new PayPalProvider();
    const ev = p.parseWebhookEvent(
      buf({ id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "CAP-9", custom_id: "ord_1" } }),
    );
    expect(ev).toMatchObject({ type: "PAID", orderId: "ord_1", eventId: "WH-1" });
    expect(ev.providerRef).toBe("paypal_CAP-9");
  });

  it("rejects unhandled events and missing identifiers", () => {
    const p = new PayPalProvider();
    expect(() => p.parseWebhookEvent(buf({ id: "WH-2", event_type: "FOO", resource: {} }))).toThrow();
    expect(() => p.parseWebhookEvent(buf({ event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { custom_id: "o" } }))).toThrow(); // no event id
    expect(() => p.parseWebhookEvent(buf({ id: "WH-3", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {} }))).toThrow(); // no orderId
  });

  it("is unconfigured in tests — checkout throws, signature verify is false", async () => {
    expect(paypalConfigured()).toBe(false);
    const p = new PayPalProvider();
    await expect(p.createCheckout({ orderId: "o1", amountKrw: 9000, buyerId: "b1" })).rejects.toThrow(/not configured/);
    expect(await p.verifyWebhookSignature(buf({ id: "x" }), {})).toBe(false);
  });
});
