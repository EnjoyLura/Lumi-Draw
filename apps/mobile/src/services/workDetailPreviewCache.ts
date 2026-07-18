import type { HomeUser, HomeWork } from "../pages/home/homeData";

const MAX_CACHED_PREVIEWS = 24;
const previewByWorkId = new Map<number, string>();
const snapshotByWorkId = new Map<number, { work: HomeWork; user: HomeUser }>();

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

export function primeWorkDetailSnapshot(work: HomeWork, user: HomeUser) {
  snapshotByWorkId.delete(work.id);
  snapshotByWorkId.set(work.id, { work: { ...work }, user: { ...user } });
  if (snapshotByWorkId.size <= MAX_CACHED_PREVIEWS) return;
  const oldestId = snapshotByWorkId.keys().next().value;
  if (typeof oldestId === "number") snapshotByWorkId.delete(oldestId);
}

export function getWorkDetailSnapshot(workId: number) {
  return snapshotByWorkId.get(workId);
}
