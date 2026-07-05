import { env } from "@/lib/env";
import type { PaymentProvider } from "./provider";
import { MockProvider } from "./mock";
import { CcbillProvider } from "./ccbill";
import { PayPalProvider } from "./paypal-provider";

let cached: PaymentProvider | null = null;

/** Returns the active payment provider, selected by PAYMENT_PROVIDER env. */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  if (env.PAYMENT_PROVIDER === "ccbill") cached = new CcbillProvider();
  else if (env.PAYMENT_PROVIDER === "paypal") cached = new PayPalProvider();
  else cached = new MockProvider();
  return cached;
}

export type { PaymentProvider, NormalizedPaymentEvent } from "./provider";
