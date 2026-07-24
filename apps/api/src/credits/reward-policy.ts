import type { PrismaService } from "../prisma/prisma.service";

export const DEFAULT_CREDITS_CONFIG = {
  registerGift: 50,
  publishReward: 2,
  favoriteReward: 0,
  inviteReward: 10
};

export const DEFAULT_CHECKIN_CONFIG = {
  base: 2,
  tiers: [2, 2, 2, 3, 3, 3, 5]
};

export const DEFAULT_INVITE_CONFIG = {
  enabled: false,
  inviterReward: 10,
  inviteeReward: 0,
  cap: 10
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function nonNegativeInt(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

async function readSetting(prisma: PrismaService, key: string, fallback: unknown) {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export async function readCreditsConfig(prisma: PrismaService) {
  const value = asObject(await readSetting(prisma, "creditsConfig", DEFAULT_CREDITS_CONFIG));
  return {
    registerGift: nonNegativeInt(value.registerGift, DEFAULT_CREDITS_CONFIG.registerGift),
    publishReward: nonNegativeInt(value.publishReward, DEFAULT_CREDITS_CONFIG.publishReward),
    favoriteReward: nonNegativeInt(value.favoriteReward, DEFAULT_CREDITS_CONFIG.favoriteReward),
    inviteReward: nonNegativeInt(value.inviteReward, DEFAULT_CREDITS_CONFIG.inviteReward)
  };
}

export async function readCheckinConfig(prisma: PrismaService) {
  const value = asObject(await readSetting(prisma, "checkinConfig", DEFAULT_CHECKIN_CONFIG));
  const rawTiers = Array.isArray(value.tiers) ? value.tiers : DEFAULT_CHECKIN_CONFIG.tiers;
  const tiers = rawTiers.slice(0, 7).map((item, index) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return nonNegativeInt((item as JsonObject).c, DEFAULT_CHECKIN_CONFIG.tiers[index] ?? DEFAULT_CHECKIN_CONFIG.base);
    }
    return nonNegativeInt(item, DEFAULT_CHECKIN_CONFIG.tiers[index] ?? DEFAULT_CHECKIN_CONFIG.base);
  });
  while (tiers.length < 7) tiers.push(DEFAULT_CHECKIN_CONFIG.tiers[tiers.length] ?? DEFAULT_CHECKIN_CONFIG.base);
  return { base: nonNegativeInt(value.base, DEFAULT_CHECKIN_CONFIG.base), tiers };
}

export async function readInviteConfig(prisma: PrismaService) {
  const value = asObject(await readSetting(prisma, "inviteConfig", DEFAULT_INVITE_CONFIG));
  return {
    enabled: value.enabled === true,
    inviterReward: nonNegativeInt(value.inviterReward, DEFAULT_INVITE_CONFIG.inviterReward),
    inviteeReward: nonNegativeInt(value.inviteeReward, DEFAULT_INVITE_CONFIG.inviteeReward),
    cap: nonNegativeInt(value.cap, DEFAULT_INVITE_CONFIG.cap)
  };
}

