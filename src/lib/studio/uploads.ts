import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ulid } from "ulid";
import { s3, S3_BUCKET } from "@/lib/s3";

/** Allowed upload MIME types → file extension. */
const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
};

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
const PUT_TTL_SECONDS = 300;

export class UploadError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "UploadError";
  }
}

export interface UploadUrl {
  key: string;
  url: string;
  expiresInSeconds: number;
}

/**
 * Validates MIME + size on the server, then returns a short-lived presigned PUT
 * URL so the client uploads directly to S3/MinIO (never through our server).
 */
export async function createUploadUrl(params: {
  creatorId: string;
  contentType: string;
  sizeBytes: number;
  kind: "preview" | "original";
}): Promise<UploadUrl> {
  const ext = MIME_EXT[params.contentType];
  if (!ext) throw new UploadError("unsupported_mime");

  const isVideo = params.contentType.startsWith("video/");
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!Number.isInteger(params.sizeBytes) || params.sizeBytes <= 0 || params.sizeBytes > limit) {
    throw new UploadError("invalid_size");
  }

  const key = `uploads/${params.creatorId}/${params.kind}/${ulid()}.${ext}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: params.contentType }),
    { expiresIn: PUT_TTL_SECONDS },
  );
  return { key, url, expiresInSeconds: PUT_TTL_SECONDS };
}
