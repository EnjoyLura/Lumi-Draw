import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { primeWorkDetailPreview, primeWorkDetailSnapshot } from "./workDetailPreviewCache";
import { workDetailOverlay } from "./workDetailOverlay";

/**
 * Enter the primary-shell detail layer synchronously. Delaying this state
 * transition leaves a touch path that can be dropped by mp-weixin when the
 * source card is inside a scrolling waterfall.
 */
export function openPreloadedWorkDetail(work: HomeWork, user: HomeUser) {
  primeWorkDetailPreview(work.id, work.image);
  primeWorkDetailSnapshot(work, user);
  workDetailOverlay.show({ work, user });
}
