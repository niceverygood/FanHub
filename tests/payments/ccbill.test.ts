import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { CcbillProvider, ccbillDigest, ccbillPrice } from "@/lib/payments/ccbill";

const form = (obj: Record<string, string>) => Buffer.from(new URLSearchParams(obj).toString(), "utf8");

describe("CcbillProvider", () => {
  it("prices KRW as a 2-decimal string", () => {
    expect(ccbillPrice(9000)).toBe("9000.00");
    expect(ccbillPrice(24000)).toBe("24000.00");
  });

  it("dynamic-pricing digest = MD5(price+period+currency+salt)", () => {
    const expected = crypto.createHash("md5").update("9000.0030410saltX").digest("hex");
    expect(ccbillDigest("9000.00", "30", "410", "saltX")).toBe(expected);
    // tamper → different digest
    expect(ccbillDigest("9001.00", "30", "410", "saltX")).not.toBe(expected);
  });

  it("maps webhook eventTypes and extracts the passthrough orderId", () => {
    const p = new CcbillProvider();
    const sale = p.parseWebhookEvent(
      form({ eventType: "NewSaleSuccess", transactionId: "tx_1", orderId: "ord_1", billedInitialPrice: "9000.00" }),
    );
    expect(sale).toMatchObject({ type: "PAID", orderId: "ord_1", eventId: "tx_1", amountKrw: 9000 });

    expect(p.parseWebhookEvent(form({ eventType: "Refund", transactionId: "tx_2", orderId: "ord_1" })).type).toBe("REFUNDED");
    expect(p.parseWebhookEvent(form({ eventType: "NewSaleFailure", transactionId: "tx_3", orderId: "ord_1" })).type).toBe("FAILED");
  });

  it("rejects unknown event types and missing identifiers", () => {
    const p = new CcbillProvider();
    expect(() => p.parseWebhookEvent(form({ eventType: "Nonsense", transactionId: "x", orderId: "y" }))).toThrow();
    expect(() => p.parseWebhookEvent(form({ eventType: "NewSaleSuccess", transactionId: "x" }))).toThrow(); // no orderId
    expect(() => p.parseWebhookEvent(form({ eventType: "NewSaleSuccess", orderId: "y" }))).toThrow(); // no txId
  });

  it("fails loudly when unconfigured (keys come from env, never code)", async () => {
    // In tests CCBILL_* env is empty → checkout throws, signature can't verify.
    const p = new CcbillProvider();
    await expect(p.createCheckout({ orderId: "o1", amountKrw: 9000, buyerId: "b1" })).rejects.toThrow(/not configured/);
    expect(p.verifyWebhookSignature(form({ dynamicPricingValidationDigest: "abc" }), {})).toBe(false);
  });
});
