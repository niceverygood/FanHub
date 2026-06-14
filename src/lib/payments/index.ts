import { env } from "@/lib/env";
import type { PaymentProvider } from "./provider";
import { MockProvider } from "./mock";
import { CcbillProvider } from "./ccbill";

let cached: PaymentProvider | null = null;

/** Returns the active payment provider, selected by PAYMENT_PROVIDER env. */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  cached = env.PAYMENT_PROVIDER === "ccbill" ? new CcbillProvider() : new MockProvider();
  return cached;
}

export type { PaymentProvider, NormalizedPaymentEvent } from "./provider";
