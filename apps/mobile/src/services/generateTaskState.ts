const ACTIVE_GENERATE_JOBS_KEY = "lumi-draw:active-generate-jobs";
const NOTIFIED_GENERATE_JOBS_KEY = "lumi-draw:notified-generate-jobs";
const MAX_STORED_IDS = 50;

function readIdSet(key: string): Set<string> {
  try {
    const raw = uni.getStorageSync(key);
    const ids = Array.isArray(raw) ? raw : JSON.parse(typeof raw === "string" && raw ? raw : "[]");
    const normalized = ids
      .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id: string) => id.trim());
    return new Set<string>(normalized);
  } catch {
    return new Set<string>();
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  uni.setStorageSync(key, Array.from(ids).slice(-MAX_STORED_IDS));
}

export function readActiveGenerateJobIds() {
  return readIdSet(ACTIVE_GENERATE_JOBS_KEY);
}

export function addActiveGenerateJobId(id: string) {
  if (!id) return;
  const ids = readActiveGenerateJobIds();
  ids.add(id);
  writeIdSet(ACTIVE_GENERATE_JOBS_KEY, ids);
}

export function syncActiveGenerateJobIds(activeIds: Iterable<string>) {
  const ids = new Set(Array.from(activeIds).filter(Boolean));
  writeIdSet(ACTIVE_GENERATE_JOBS_KEY, ids);
}

export function removeActiveGenerateJobIds(idsToRemove: Iterable<string>) {
  const ids = readActiveGenerateJobIds();
  Array.from(idsToRemove).forEach((id) => ids.delete(id));
  writeIdSet(ACTIVE_GENERATE_JOBS_KEY, ids);
}

export function readNotifiedGenerateJobIds() {
  return readIdSet(NOTIFIED_GENERATE_JOBS_KEY);
}

export function addNotifiedGenerateJobIds(idsToAdd: Iterable<string>) {
  const ids = readNotifiedGenerateJobIds();
  Array.from(idsToAdd).forEach((id) => {
    if (id) ids.add(id);
  });
  writeIdSet(NOTIFIED_GENERATE_JOBS_KEY, ids);
}
