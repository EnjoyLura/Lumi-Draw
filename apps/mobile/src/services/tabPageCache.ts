const loadedAt = new Map<string, number>();
const pendingLoads = new Map<string, Promise<void>>();

export function invalidateTabPage(key: string) {
  loadedAt.delete(key);
}

export async function refreshTabPage(key: string, loader: () => Promise<void>, options?: { force?: boolean; ttl?: number }) {
  const ttl = options?.ttl ?? 60_000;
  const timestamp = loadedAt.get(key);
  if (!options?.force && typeof timestamp === "number" && Date.now() - timestamp < ttl) return false;

  const pending = pendingLoads.get(key);
  if (pending) {
    await pending;
    return true;
  }

  const request = loader()
    .then(() => {
      loadedAt.set(key, Date.now());
    })
    .finally(() => pendingLoads.delete(key));
  pendingLoads.set(key, request);
  await request;
  return true;
}
