export const QUALITY_TIERS = ["1K", "2K", "4K"] as const;

export type QualityTier = (typeof QUALITY_TIERS)[number];
export type ProviderRouting = Partial<Record<QualityTier, string>>;

export function extractQualityTier(label: string): QualityTier | undefined {
  return label.match(/\b(1K|2K|4K)\b/i)?.[1]?.toUpperCase() as QualityTier | undefined;
}

export function normalizeProviderRouting(value: unknown): ProviderRouting {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  return Object.fromEntries(
    QUALITY_TIERS.flatMap((tier) => {
      const value = input[tier];
      const providerId = typeof value === "string" ? value.trim() : "";
      return providerId ? [[tier, providerId]] : [];
    })
  ) as ProviderRouting;
}

export function resolveProviderId(defaultProviderId: string, routing: unknown, qualityLabel: string) {
  const tier = extractQualityTier(qualityLabel);
  return (tier && normalizeProviderRouting(routing)[tier]) || defaultProviderId;
}
