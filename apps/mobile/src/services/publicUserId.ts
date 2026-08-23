const PUBLIC_ID_PREFIX = "LUMI_";
const PUBLIC_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
  let hash = hashInternalId(String(internalId || "guest"));
  let fallback = "";
  for (let index = 0; index < 4; index += 1) {
    fallback += PUBLIC_ID_ALPHABET[hash % PUBLIC_ID_ALPHABET.length];
    hash = Math.floor(hash / PUBLIC_ID_ALPHABET.length);
  }
  return `${PUBLIC_ID_PREFIX}${fallback}`;
}
