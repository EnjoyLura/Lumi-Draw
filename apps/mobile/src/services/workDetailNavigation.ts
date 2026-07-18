import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { primeWorkDetailPreview, primeWorkDetailSnapshot } from "./workDetailPreviewCache";
import { workDetailOverlay } from "./workDetailOverlay";

let isWorkDetailNavigationPending = false;

/**
 * Keep the source card stable for two frames after a tap, then open the
 * already-primed detail page. This is intentionally tiny: it reduces the
 * chance of WeChat capturing the detail page's construction frame without
 * making a tap feel delayed.
 */
export function openPreloadedWorkDetail(work: HomeWork, user: HomeUser) {
  if (isWorkDetailNavigationPending) return;

  primeWorkDetailPreview(work.id, work.image);
  primeWorkDetailSnapshot(work, user);
  isWorkDetailNavigationPending = true;

  // Keep this to one frame so rapid double-taps cannot reopen the layer while
  // its closing animation is still in progress. Do not navigateTo here: the
  // primary shell renders a normal overlay with its own expand transition.
  setTimeout(() => {
    isWorkDetailNavigationPending = false;
    workDetailOverlay.show({ work, user });
  }, 16);
}
