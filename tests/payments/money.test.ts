import { describe, it, expect } from "vitest";
import { splitAmount } from "@/lib/money";

describe("money: splitAmount (integer KRW only)", () => {
  it("splits exactly and sums back to the gross", () => {
    const { creatorKrw, platformKrw } = splitAmount(15000, 8000); // 80%
    expect(creatorKrw).toBe(12000);
    expect(platformKrw).toBe(3000);
    expect(creatorKrw + platformKrw).toBe(15000);
  });

  it("floors the creator share so the parts always reconcile", () => {
    const { creatorKrw, platformKrw } = splitAmount(9999, 8000); // 7999.2 -> 7999
    expect(creatorKrw).toBe(7999);
    expect(platformKrw).toBe(2000);
    expect(creatorKrw + platformKrw).toBe(9999);
  });

  it("rejects non-integer / negative amounts", () => {
    expect(() => splitAmount(100.5, 8000)).toThrow();
    expect(() => splitAmount(-1, 8000)).toThrow();
    expect(() => splitAmount(1000, 10001)).toThrow();
  });
});
