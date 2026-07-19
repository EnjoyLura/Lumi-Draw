import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { fetchWorkDetail } from "../pages/work-detail/workDetailService";
import { getWorkDetailSnapshot, primeWorkDetailSnapshot } from "./workDetailPreviewCache";
import { fetchWorkState } from "./social";
import { useAuth } from "./auth";

type WorkSeed = { work: HomeWork; user: HomeUser };

const MAX_CONCURRENT_REQUESTS = 3;
const queuedIds = new Set<number>();
const completedIds = new Set<number>();
const queue: WorkSeed[] = [];
let activeRequests = 0;
const { isLoggedIn } = useAuth();

/**
 * List cards already carry most detail fields. Fetch the remaining canonical
 * metadata while the user is browsing, without loading the original image.
 */
export function preloadWorkDetailSnapshots(entries: WorkSeed[]) {
  entries.forEach((entry) => {
    if (completedIds.has(entry.work.id) || queuedIds.has(entry.work.id)) return;
    queuedIds.add(entry.work.id);
    queue.push(entry);
  });
  drainQueue();
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

async function preloadOne({ work, user }: WorkSeed) {
  try {
    const [detail, state] = await Promise.all([
      fetchWorkDetail(work.id),
      isLoggedIn.value ? fetchWorkState(work.id).catch(() => null) : Promise.resolve(null)
    ]);
    const cached = getWorkDetailSnapshot(work.id);
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
    completedIds.add(work.id);
  } catch {
    // A list card remains usable with its own complete-enough payload.
  } finally {
    queuedIds.delete(work.id);
  }
}
