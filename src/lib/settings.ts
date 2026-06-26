import { prisma } from "@/lib/prisma";

/**
 * Platform settings live in the DB `Setting` table (not env). Revenue shares are
 * stored as integer basis points so every split stays exact integer math.
 *
 * Two tiers:
 *  - non-referred creator: `creator_share_bps` (default 70%), platform keeps the rest.
 *  - host-referred creator: `referred_creator_share_bps` (default 80%) to the
 *    creator + `host_commission_bps` (default 10%) to the host; platform keeps
 *    the remainder (default 10%).
 */
export const SETTING_KEYS = {
  creatorShareBps: "creator_share_bps",
  referredCreatorShareBps: "referred_creator_share_bps",
  hostCommissionBps: "host_commission_bps",
} as const;

const DEFAULTS: Record<string, number> = {
  [SETTING_KEYS.creatorShareBps]: 7000, // 70%
  [SETTING_KEYS.referredCreatorShareBps]: 8000, // 80%
  [SETTING_KEYS.hostCommissionBps]: 1000, // 10%
};

async function getBps(key: string): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return DEFAULTS[key] ?? 0;
  const parsed = Number.parseInt(row.value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) {
    throw new Error(`Invalid ${key} setting: ${row.value}`);
  }
  return parsed;
}

/** Non-referred creator share (basis points). */
export async function getCreatorShareBps(): Promise<number> {
  return getBps(SETTING_KEYS.creatorShareBps);
}

export interface SplitConfig {
  defaultCreatorBps: number;
  referredCreatorBps: number;
  hostCommissionBps: number;
}

/** Reads all three split rates once (cheap, global) — resolve per-sale with resolveSplit. */
export async function getSplitConfig(): Promise<SplitConfig> {
  const [defaultCreatorBps, referredCreatorBps, hostCommissionBps] = await Promise.all([
    getBps(SETTING_KEYS.creatorShareBps),
    getBps(SETTING_KEYS.referredCreatorShareBps),
    getBps(SETTING_KEYS.hostCommissionBps),
  ]);
  return { defaultCreatorBps, referredCreatorBps, hostCommissionBps };
}

/** Pure resolver: given the config + whether the creator has a host, the split. */
export function resolveSplit(cfg: SplitConfig, hasHost: boolean): { creatorBps: number; hostBps: number } {
  const split = hasHost
    ? { creatorBps: cfg.referredCreatorBps, hostBps: cfg.hostCommissionBps }
    : { creatorBps: cfg.defaultCreatorBps, hostBps: 0 };
  if (split.creatorBps + split.hostBps > 10_000) {
    throw new Error(`split exceeds 100%: creator ${split.creatorBps} + host ${split.hostBps} bps`);
  }
  return split;
}
