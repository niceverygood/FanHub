import { prisma } from "@/lib/prisma";

/**
 * Platform settings live in the DB `Setting` table (not env). The creator
 * revenue share is stored as integer basis points so the split stays exact.
 */
export const SETTING_KEYS = {
  creatorShareBps: "creator_share_bps",
} as const;

const DEFAULT_CREATOR_SHARE_BPS = 8000; // 80%

/** Reads the creator share (basis points) from the Setting table. */
export async function getCreatorShareBps(): Promise<number> {
  const row = await prisma.setting.findUnique({
    where: { key: SETTING_KEYS.creatorShareBps },
  });
  if (!row) return DEFAULT_CREATOR_SHARE_BPS;
  const parsed = Number.parseInt(row.value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) {
    throw new Error(`Invalid ${SETTING_KEYS.creatorShareBps} setting: ${row.value}`);
  }
  return parsed;
}
