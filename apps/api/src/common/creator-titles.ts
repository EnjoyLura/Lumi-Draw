export interface CreatorTitleTier {
  minWorks: number;
  name: string;
}

export const DEFAULT_CREATOR_TITLE_TIERS: CreatorTitleTier[] = [
  { minWorks: 0, name: "画布新星" },
  { minWorks: 1, name: "灵感画师" },
  { minWorks: 10, name: "创意达人" },
  { minWorks: 30, name: "风格主理人" },
  { minWorks: 50, name: "光影大师" },
  { minWorks: 100, name: "星耀艺术家" }
];

export function normalizeCreatorTitleTiers(value: unknown): CreatorTitleTier[] {
  if (!Array.isArray(value) || value.length !== DEFAULT_CREATOR_TITLE_TIERS.length) return DEFAULT_CREATOR_TITLE_TIERS;
  const tiers = value.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      minWorks: Math.max(0, Math.floor(Number(row.minWorks) || 0)),
      name: String(row.name || "").trim().slice(0, 12)
    };
  });
  if (tiers.some((tier) => !tier.name) || tiers.some((tier, index) => index > 0 && tier.minWorks <= tiers[index - 1].minWorks)) {
    return DEFAULT_CREATOR_TITLE_TIERS;
  }
  return tiers;
}

export function resolveCreatorTitle(tiers: CreatorTitleTier[], publishedWorksCount: number) {
  return tiers.reduce((current, tier) => (publishedWorksCount >= tier.minWorks ? tier : current), tiers[0]).name;
}
