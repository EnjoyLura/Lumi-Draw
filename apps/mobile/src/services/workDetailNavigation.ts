import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { primeWorkDetailPreview, primeWorkDetailSnapshot } from "./workDetailPreviewCache";

/**
 * Preserve the list preview and detail seed before entering the established
 * work-detail page. The page consumes this snapshot on its first frame.
 */
export function openPreloadedWorkDetail(work: HomeWork, user: HomeUser) {
  primeWorkDetailPreview(work.id, work.image);
  primeWorkDetailSnapshot(work, user);
  uni.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` });
}
