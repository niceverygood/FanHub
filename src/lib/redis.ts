import Redis from "ioredis";
import { env } from "@/lib/env";

/**
 * Shared ioredis connection (sessions cache, rate-limit, chart aggregation,
 * live-trade ticker pub/sub). Reused across hot reloads in dev.
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
