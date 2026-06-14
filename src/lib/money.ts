/**
 * Money utilities. ALL amounts are integer KRW. No Float/Decimal ever.
 * Fee rate is expressed in basis points (1/100 of a percent) as an integer,
 * so the creator-share split stays exact integer arithmetic.
 */

const BPS_DENOMINATOR = 10_000; // 100% = 10000 bps

/**
 * Splits a gross amount into the creator's share and the platform's share
 * using a basis-points rate, using only integer math. The platform keeps the
 * remainder so the two parts always sum back to `amountKrw` exactly.
 *
 * @param amountKrw  gross amount in integer KRW
 * @param creatorShareBps  creator's cut in basis points (e.g. 8000 = 80%)
 */
export function splitAmount(
  amountKrw: number,
  creatorShareBps: number,
): { creatorKrw: number; platformKrw: number } {
  assertIntKrw(amountKrw);
  if (!Number.isInteger(creatorShareBps) || creatorShareBps < 0 || creatorShareBps > BPS_DENOMINATOR) {
    throw new Error(`Invalid creatorShareBps: ${creatorShareBps}`);
  }
  // floor toward the platform; creator gets the truncated share, platform the rest
  const creatorKrw = Math.floor((amountKrw * creatorShareBps) / BPS_DENOMINATOR);
  const platformKrw = amountKrw - creatorKrw;
  return { creatorKrw, platformKrw };
}

/** Throws unless `n` is a non-negative safe integer (a valid KRW amount). */
export function assertIntKrw(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`Amount must be a non-negative integer KRW: got ${n}`);
  }
}

/** Formats integer KRW for display, e.g. 12000 -> "₩12,000". */
export function formatKrw(amountKrw: number): string {
  return `₩${amountKrw.toLocaleString("ko-KR")}`;
}
