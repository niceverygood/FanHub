import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * S3-compatible client (MinIO locally; could be Supabase Storage / R2 / S3 in
 * production). Null when storage env is not configured — the upload / signed-URL
 * features then report "storage_not_configured" while the rest of the app runs.
 * The bucket is always private; access is only via short-lived presigned URLs.
 */
const globalForS3 = globalThis as unknown as { s3: S3Client | null | undefined };

function createS3(): S3Client | null {
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY || !env.S3_BUCKET) {
    return null;
  }
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

export const s3 = globalForS3.s3 ?? createS3();

if (process.env.NODE_ENV !== "production") {
  globalForS3.s3 = s3;
}

export const S3_BUCKET = env.S3_BUCKET ?? "";
export const storageEnabled = s3 !== null;
