import Redis from "ioredis";
import { env } from "@/lib/env";

/**
 * Shared ioredis connection (rate-limit, ticker, chart cache, pub/sub).
 *
 * Serverless-tolerant: lazy connect, no offline queue, and connection errors are
 * swallowed. Callers (rateLimit / ticker / chart) handle command failures and
 * degrade gracefully, so the app runs even when Redis is absent (e.g. Vercel
 * without Upstash configured).
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis {
  // Fallback URL is never reachable on a serverless host → commands fail fast and
  // callers degrade. When REDIS_URL is set, this is the real connection.
  const client = new Redis(env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  client.on("error", () => {
    // Swallow — callers catch command rejections and degrade.
  });
  return client;
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

/** True when a real Redis URL is configured. */
export const redisEnabled = Boolean(env.REDIS_URL);
