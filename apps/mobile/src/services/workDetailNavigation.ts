import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { primeWorkDetailPreview, primeWorkDetailSnapshot } from "./workDetailPreviewCache";

export const WORK_DETAIL_OVERLAY_OPEN_EVENT = "lumi:work-detail-overlay-open";

export interface WorkDetailOverlayOpenPayload {
  work: HomeWork;
  user: HomeUser;
}

/**
 * The primary shell listens for this event and renders the established detail
 * page as an in-place layer, avoiding mp-weixin's native page transition.
 */
export function openPreloadedWorkDetail(work: HomeWork, user: HomeUser) {
  primeWorkDetailPreview(work.id, work.image);
  primeWorkDetailSnapshot(work, user);
  uni.$emit(WORK_DETAIL_OVERLAY_OPEN_EVENT, { work, user } satisfies WorkDetailOverlayOpenPayload);
}
