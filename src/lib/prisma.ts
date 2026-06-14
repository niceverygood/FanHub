import { PrismaClient } from "@prisma/client";

/**
 * Single PrismaClient instance, reused across hot reloads in dev to avoid
 * exhausting Postgres connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Quiet under Vitest: the webhook dedup test intentionally triggers a caught
    // P2002, and Prisma logs caught errors — that noise is not a failure.
    log: process.env.VITEST
      ? []
      : process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
