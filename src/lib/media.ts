import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

/** Signed URLs expire fast — content is never durably linkable. */
export const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

/** Presigned GET for a private object. The bucket itself is never public. */
export async function signedGetUrl(
  key: string,
  ttl = SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  if (!s3) throw new Error("storage_not_configured");
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), {
    expiresIn: ttl,
  });
}

/**
 * Returns the active (non-revoked) entitlement for (user, content) or null.
 * The ownership check is part of the query — the only basis for access, and
 * IDOR-safe because buyerId is pinned to the caller.
 */
export async function entitlementFor(userId: string, contentId: string) {
  return prisma.entitlement.findFirst({
    where: { buyerId: userId, contentId, revokedAt: null },
  });
}

/** Coerces the Json assetKeys column into a string[] defensively. */
export function assetKeysOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((k): k is string => typeof k === "string");
}
