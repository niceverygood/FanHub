import { redis } from "@/lib/redis";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
}

/**
 * Fixed-window rate limit backed by Redis. Keyed by caller-supplied identity
 * (e.g. `orders:${userId}:${ip}`). All payment-related APIs must use this.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    // Fail open when Redis is unavailable — never block a payment on a cache miss.
    return { ok: true, remaining: limit };
  }
}
