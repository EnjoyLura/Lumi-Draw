import type { HomeUser, HomeWork } from "../pages/home/homeData";

const MAX_CACHED_PREVIEWS = 24;
const DETAIL_PREVIEW_TTL = 4 * 60_000;
const DETAIL_SNAPSHOT_TTL = 5 * 60_000;
type PreviewEntry = {
  imageUrl: string;
  assetKey: string;
  kind: "card" | "detail";
  expiresAt: number;
};
type SnapshotEntry = {
  work: HomeWork;
  user: HomeUser;
  expiresAt: number;
};
const previewByWorkId = new Map<number, PreviewEntry>();
const snapshotByWorkId = new Map<number, SnapshotEntry>();

function imageAssetKey(imageUrl: string) {
  return imageUrl.split(/[?#]/, 1)[0] || imageUrl;
}

function setPreviewEntry(workId: number, entry: PreviewEntry) {
  previewByWorkId.delete(workId);
  previewByWorkId.set(workId, entry);
  if (previewByWorkId.size <= MAX_CACHED_PREVIEWS) return;
  const oldestId = previewByWorkId.keys().next().value;
  if (typeof oldestId === "number") previewByWorkId.delete(oldestId);
}

/**
 * Reuse the already rendered list thumbnail while the detail-quality preview
 * is loading. This is deliberately a small in-memory cache: it avoids
 * downloading every work's large preview in the background.
 */
export function primeWorkDetailPreview(workId: number, imageUrl?: string) {
  if (!imageUrl) return;
  const assetKey = imageAssetKey(imageUrl);
  const cached = previewByWorkId.get(workId);
  if (cached?.kind === "detail" && cached.assetKey === assetKey && cached.expiresAt > Date.now()) {
    setPreviewEntry(workId, cached);
    return;
  }
  setPreviewEntry(workId, { imageUrl, assetKey, kind: "card", expiresAt: Date.now() + DETAIL_PREVIEW_TTL });
}

export function getWorkDetailPreview(workId: number) {
  const cached = previewByWorkId.get(workId);
  if (!cached || cached.expiresAt <= Date.now()) {
    previewByWorkId.delete(workId);
    return "";
  }
  setPreviewEntry(workId, cached);
  return cached.imageUrl;
}

export function primeWorkDetailQualityPreview(workId: number, imageUrl: string) {
  if (!imageUrl) return;
  setPreviewEntry(workId, {
    imageUrl,
    assetKey: imageAssetKey(imageUrl),
    kind: "detail",
    expiresAt: Date.now() + DETAIL_PREVIEW_TTL
  });
}

export function getWorkDetailQualityPreview(workId: number, sourceImageUrl?: string) {
  const cached = previewByWorkId.get(workId);
  const matchesAsset = !sourceImageUrl || cached?.assetKey === imageAssetKey(sourceImageUrl);
  if (!cached || cached.kind !== "detail" || cached.expiresAt <= Date.now() || !matchesAsset) {
    if (cached && (cached.expiresAt <= Date.now() || !matchesAsset)) previewByWorkId.delete(workId);
    return "";
  }
  setPreviewEntry(workId, cached);
  return cached.imageUrl;
}

export function primeWorkDetailSnapshot(work: HomeWork, user: HomeUser) {
  snapshotByWorkId.delete(work.id);
  snapshotByWorkId.set(work.id, {
    work: { ...work },
    user: { ...user },
    expiresAt: Date.now() + DETAIL_SNAPSHOT_TTL
  });
  if (snapshotByWorkId.size <= MAX_CACHED_PREVIEWS) return;
  const oldestId = snapshotByWorkId.keys().next().value;
  if (typeof oldestId === "number") snapshotByWorkId.delete(oldestId);
}

export function getWorkDetailSnapshot(workId: number) {
  const cached = snapshotByWorkId.get(workId);
  if (!cached || cached.expiresAt <= Date.now()) {
    snapshotByWorkId.delete(workId);
    return undefined;
  }
  snapshotByWorkId.delete(workId);
  snapshotByWorkId.set(workId, cached);
  return cached;
}

export function patchWorkDetailSnapshot(workId: number, patch: Partial<HomeWork>) {
  const cached = getWorkDetailSnapshot(workId);
  if (!cached) return false;
  primeWorkDetailSnapshot({ ...cached.work, ...patch, id: workId }, cached.user);
  return true;
}

export function patchWorkDetailAuthors(userId: number, patch: Partial<HomeUser>) {
  const workIds = Array.from(snapshotByWorkId.keys());
  workIds.forEach((workId) => {
    const cached = getWorkDetailSnapshot(workId);
    if (!cached || cached.user.id !== userId) return;
    primeWorkDetailSnapshot(cached.work, { ...cached.user, ...patch, id: userId });
  });
}

export function clearWorkDetailCache(workId: number, options?: { keepPreview?: boolean }) {
  snapshotByWorkId.delete(workId);
  if (!options?.keepPreview) previewByWorkId.delete(workId);
}
