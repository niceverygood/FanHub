import { z } from "zod";

/**
 * Centralized, validated environment access. Importing this module throws at
 * startup if required env vars are missing/malformed — fail fast, never `any`.
 * Keep this file free of server-only deps (prisma/redis) so it stays importable
 * anywhere; it only reads process.env + zod.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 chars"),
  AUTH_URL: z.string().url().default("http://localhost:3000"),

  EMAIL_FROM: z.string().default("FanHub <no-reply@fanhub.local>"),
  EMAIL_SERVER_HOST: z.string().optional().default(""),
  EMAIL_SERVER_PORT: z.string().optional().default(""),
  EMAIL_SERVER_USER: z.string().optional().default(""),
  EMAIL_SERVER_PASSWORD: z.string().optional().default(""),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  PAYMENT_PROVIDER: z.enum(["mock", "ccbill"]).default("mock"),
  PAYMENT_WEBHOOK_SECRET: z.string().min(8),

  CCBILL_ACCOUNT_NUMBER: z.string().optional().default(""),
  CCBILL_SUBACCOUNT: z.string().optional().default(""),
  CCBILL_SALT: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Do not log values — only the keys that failed.
  const issues = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

export const env = parsed.data;
