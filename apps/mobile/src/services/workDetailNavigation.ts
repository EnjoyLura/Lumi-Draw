import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { primeWorkDetailPreview, primeWorkDetailSnapshot } from "./workDetailPreviewCache";
import type { WorkDetailOverlaySeed } from "./workDetailOverlay";

export const WORK_DETAIL_OVERLAY_OPEN_EVENT = "lumi:work-detail-overlay-open";

/**
 * Enter the primary-shell detail layer synchronously. Delaying this state
 * transition leaves a touch path that can be dropped by mp-weixin when the
 * source card is inside a scrolling waterfall.
 */
export function openPreloadedWorkDetail(work: HomeWork, user: HomeUser) {
  primeWorkDetailPreview(work.id, work.image);
  primeWorkDetailSnapshot(work, user);
  // The primary shell owns the actual component state.  An explicit event is
  // more reliable than a module-level Vue ref across mp-weixin components.
  uni.$emit(WORK_DETAIL_OVERLAY_OPEN_EVENT, {
    work: { ...work },
    user: { ...user }
  } satisfies WorkDetailOverlaySeed);
}
