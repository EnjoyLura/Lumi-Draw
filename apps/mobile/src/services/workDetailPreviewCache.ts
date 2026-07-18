const MAX_CACHED_PREVIEWS = 24;
const previewByWorkId = new Map<number, string>();

/**
 * Reuse the already rendered list thumbnail while the detail-quality preview
 * is loading. This is deliberately a small in-memory cache: it avoids
 * downloading every work's large preview in the background.
 */
export function primeWorkDetailPreview(workId: number, imageUrl?: string) {
  if (!imageUrl) return;
  previewByWorkId.delete(workId);
  previewByWorkId.set(workId, imageUrl);
  if (previewByWorkId.size <= MAX_CACHED_PREVIEWS) return;
  const oldestId = previewByWorkId.keys().next().value;
  if (typeof oldestId === "number") previewByWorkId.delete(oldestId);
}

export function getWorkDetailPreview(workId: number) {
  return previewByWorkId.get(workId) || "";
}
