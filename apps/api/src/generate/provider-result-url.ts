export type ProviderResultUrlRewriteRule = {
  sourceHost: string;
  targetHost: string;
};

export function normalizeProviderResultUrlRewriteRules(value: unknown): ProviderResultUrlRewriteRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const sourceHost = String(record.sourceHost || "").trim().toLowerCase();
    const targetHost = String(record.targetHost || "").trim().toLowerCase();
    return sourceHost && targetHost ? [{ sourceHost, targetHost }] : [];
  });
}

export function rewriteProviderResultUrl(
  value: string,
  rulesValue: unknown
): { url: string; fallbackUrl: string } {
  const fallbackUrl = value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { url: value, fallbackUrl: "" };
  }
  if (url.protocol !== "https:") return { url: value, fallbackUrl: "" };
  const rule = normalizeProviderResultUrlRewriteRules(rulesValue)
    .find((item) => item.sourceHost === url.hostname.toLowerCase());
  if (!rule || rule.sourceHost === rule.targetHost) return { url: value, fallbackUrl: "" };
  url.hostname = rule.targetHost;
  return { url: url.toString(), fallbackUrl };
}
