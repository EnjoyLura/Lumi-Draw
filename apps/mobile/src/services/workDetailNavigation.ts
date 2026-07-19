import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { getWorkDetailSnapshot, primeWorkDetailPreview, primeWorkDetailSnapshot } from "./workDetailPreviewCache";

export const WORK_DETAIL_OVERLAY_OPEN_EVENT = "lumi:work-detail-overlay-open";

export interface WorkDetailOverlayOpenPayload {
  work: HomeWork;
  user: HomeUser;
  sourceRect: WorkDetailSourceRect | null;
}

export interface WorkDetailSourceRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The primary shell listens for this event and renders the established detail
 * page as an in-place layer, avoiding mp-weixin's native page transition.
 */
export async function openPreloadedWorkDetail(work: HomeWork, user: HomeUser, sourceId?: string) {
  primeWorkDetailPreview(work.id, work.image);
  const cached = getWorkDetailSnapshot(work.id);
  const seedWork = cached
    ? { ...cached.work, image: work.image, previewImage: work.image, likes: work.likes, liked: work.liked, favorited: work.favorited }
    : work;
  const seedUser = cached ? { ...cached.user, ...user } : user;
  primeWorkDetailSnapshot(seedWork, seedUser);
  const sourceRect = sourceId ? await getSourceRect(sourceId) : null;
  uni.$emit(WORK_DETAIL_OVERLAY_OPEN_EVENT, { work: seedWork, user: seedUser, sourceRect } satisfies WorkDetailOverlayOpenPayload);
}

function getSourceRect(sourceId: string) {
  return new Promise<WorkDetailSourceRect | null>((resolve) => {
    uni.createSelectorQuery()
      .select(`#${sourceId}`)
      .boundingClientRect((result) => {
        const rect = Array.isArray(result) ? result[0] : result;
        const left = Number(rect?.left);
        const top = Number(rect?.top);
        const width = Number(rect?.width);
        const height = Number(rect?.height);
        if (!Number.isFinite(left) || !Number.isFinite(top) || !width || !height) {
          resolve(null);
          return;
        }
        resolve({ left, top, width, height });
      })
      .exec();
  });
}
