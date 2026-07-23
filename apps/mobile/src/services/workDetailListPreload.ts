import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { fetchWorkDetail } from "../pages/work-detail/workDetailService";
import { getWorkDetailSnapshot, primeWorkDetailSnapshot } from "./workDetailPreviewCache";
import { fetchWorkState } from "./social";
import { useAuth } from "./auth";

type WorkSeed = { work: HomeWork; user: HomeUser };
type QueuedWorkSeed = WorkSeed & { revision: number };

const MAX_CONCURRENT_REQUESTS = 3;
const PRELOAD_COMPLETION_TTL = 5 * 60_000;
const queuedIds = new Set<number>();
const completedIds = new Map<number, number>();
const revisionsByWorkId = new Map<number, number>();
const queue: QueuedWorkSeed[] = [];
let activeRequests = 0;
const { isLoggedIn } = useAuth();

/**
 * List cards already carry most detail fields. Fetch the remaining canonical
 * metadata while the user is browsing, without loading the original image.
 */
export function preloadWorkDetailSnapshots(entries: WorkSeed[]) {
  entries.forEach((entry) => {
    const completedUntil = completedIds.get(entry.work.id) ?? 0;
    if (completedUntil > Date.now() || queuedIds.has(entry.work.id)) return;
    completedIds.delete(entry.work.id);
    queuedIds.add(entry.work.id);
    queue.push({ ...entry, revision: revisionsByWorkId.get(entry.work.id) ?? 0 });
  });
  drainQueue();
}

export function invalidateWorkDetailPreload(workId: number) {
  completedIds.delete(workId);
  revisionsByWorkId.set(workId, (revisionsByWorkId.get(workId) ?? 0) + 1);
}

function drainQueue() {
  while (activeRequests < MAX_CONCURRENT_REQUESTS && queue.length) {
    const entry = queue.shift();
    if (!entry) return;
    activeRequests += 1;
    void preloadOne(entry).finally(() => {
      activeRequests -= 1;
      drainQueue();
    });
  }
}

async function preloadOne({ work, user, revision }: QueuedWorkSeed) {
  try {
    const [detail, state] = await Promise.all([
      fetchWorkDetail(work.id),
      isLoggedIn.value ? fetchWorkState(work.id).catch(() => null) : Promise.resolve(null)
    ]);
    const cached = getWorkDetailSnapshot(work.id);
    if ((revisionsByWorkId.get(work.id) ?? 0) !== revision) return;
    const listWork = cached?.work ?? work;
    const listUser = cached?.user ?? user;
    // Preserve the already rendered list image. The returned original URL is
    // deliberately retained only by the API response, never bound to <image>.
    primeWorkDetailSnapshot(
      {
        ...listWork,
        ...detail.work,
        image: listWork.image,
        liked: state?.liked ?? listWork.liked,
        favorited: state?.favorited ?? listWork.favorited,
        isDetailPreloaded: true
      },
      { ...listUser, ...detail.user }
    );
    completedIds.set(work.id, Date.now() + PRELOAD_COMPLETION_TTL);
  } catch {
    // A list card remains usable with its own complete-enough payload.
  } finally {
    queuedIds.delete(work.id);
  }
}
