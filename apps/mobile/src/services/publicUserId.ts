const PUBLIC_ID_PREFIX = "露米_";

function hashInternalId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function formatPublicUserId(publicId: string | null | undefined, internalId: number | string) {
  const normalized = publicId?.trim();
  if (normalized) return normalized;
  const fallback = hashInternalId(String(internalId || "guest")).toString(36).padStart(5, "0").slice(-5);
  return `${PUBLIC_ID_PREFIX}${fallback}`;
}
