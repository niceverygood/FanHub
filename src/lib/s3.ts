import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * S3-compatible client (MinIO in dev). The content bucket is fully private;
 * access is granted only via short-lived presigned URLs (see Phase 3 media
 * pipeline). Never make the bucket public.
 */
const globalForS3 = globalThis as unknown as { s3: S3Client | undefined };

export const s3 =
  globalForS3.s3 ??
  new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForS3.s3 = s3;
}

export const S3_BUCKET = env.S3_BUCKET;
