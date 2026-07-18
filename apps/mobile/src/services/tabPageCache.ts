const loadedAt = new Map<string, number>();
const pendingLoads = new Map<string, Promise<void>>();

// Primary pages stay mounted inside the app shell. A short cache avoids repeated
// list requests and lets WeChat reuse its native image cache while users switch tabs.
export const TAB_PAGE_CACHE_TTL = 5 * 60_000;

export function invalidateTabPage(key: string) {
  loadedAt.delete(key);
}

export function invalidateTabPages(prefix: string) {
  for (const key of loadedAt.keys()) {
    if (key.startsWith(prefix)) loadedAt.delete(key);
  }
}

export async function refreshTabPage(key: string, loader: () => Promise<void>, options?: { force?: boolean; ttl?: number }) {
  const ttl = options?.ttl ?? TAB_PAGE_CACHE_TTL;
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
