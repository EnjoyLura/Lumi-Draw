import type { HomeUser, HomeWork } from "../pages/home/homeData";
import { getWorkDetailSnapshot, primeWorkDetailPreview, primeWorkDetailSnapshot } from "./workDetailPreviewCache";

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

type WorkDetailOverlayHandler = (payload: WorkDetailOverlayOpenPayload) => void;

const overlayHandlers = new Map<string, Set<WorkDetailOverlayHandler>>();

export function registerWorkDetailOverlay(ownerRoute: string, handler: WorkDetailOverlayHandler) {
  const route = normalizeRoute(ownerRoute);
  const handlers = overlayHandlers.get(route) ?? new Set<WorkDetailOverlayHandler>();
  handlers.add(handler);
  overlayHandlers.set(route, handlers);
  return () => {
    handlers.delete(handler);
    if (!handlers.size) overlayHandlers.delete(route);
  };
}

/**
 * The primary shell listens for this event and renders the established detail
 * page as an in-place layer, avoiding mp-weixin's native page transition.
 */
export async function openPreloadedWorkDetail(
  work: HomeWork,
  user: HomeUser,
  sourceId?: string,
  sourceContext?: object | null,
  ownerRoute?: string
) {
  primeWorkDetailPreview(work.id, work.image);
  const cached = getWorkDetailSnapshot(work.id);
  const seedWork = cached
    ? {
        ...cached.work,
        image: work.image,
        previewImage: work.image,
        likes: work.likes,
        favorites: work.favorites,
        liked: work.liked ?? cached.work.liked,
        favorited: work.favorited ?? cached.work.favorited
      }
    : work;
  const seedUser = cached ? { ...cached.user, ...user } : user;
  primeWorkDetailSnapshot(seedWork, seedUser);
  let sourceRect: WorkDetailSourceRect | null = null;
  if (sourceId) {
    try {
      sourceRect = await getSourceRect(sourceId, sourceContext);
    } catch {
      // Coordinate lookup must never block opening the detail overlay.
    }
  }
  const payload = { work: seedWork, user: seedUser, sourceRect } satisfies WorkDetailOverlayOpenPayload;
  const handled = openRegisteredOverlay(payload, ownerRoute);
  if (!handled) {
    uni.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` });
  }
}

function openRegisteredOverlay(payload: WorkDetailOverlayOpenPayload, ownerRoute?: string) {
  const handlers = overlayHandlers.get(ownerRoute ? normalizeRoute(ownerRoute) : currentRoute());
  const handlerList = handlers ? Array.from(handlers) : [];
  const handler = handlerList[handlerList.length - 1];
  if (!handler) return false;
  handler(payload);
  return true;
}

function currentRoute() {
  try {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1] as { route?: string } | undefined;
    if (current?.route) return normalizeRoute(current.route);
  } catch {
    // H5 falls through to the hash route.
  }
  if (typeof window === "undefined") return "";
  return normalizeRoute(window.location.hash.replace(/^#\/?/, "").split("?")[0]);
}

function normalizeRoute(route: string) {
  return route.replace(/^\/+/, "").split("?")[0];
}

function getSourceRect(sourceId: string, sourceContext?: object | null) {
  return new Promise<WorkDetailSourceRect | null>((resolve) => {
    let settled = false;
    const finish = (rect: WorkDetailSourceRect | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      resolve(rect);
    };
    const watchdog = setTimeout(() => finish(null), 120);

    try {
      const query = uni.createSelectorQuery();
      const context = (sourceContext as { $scope?: object } | null | undefined)?.$scope ?? sourceContext;
      const scopedQuery = context ? query.in(context as never) : query;
      scopedQuery
        .select(`#${sourceId}`)
        .boundingClientRect((result) => {
          const rect = Array.isArray(result) ? result[0] : result;
          const left = Number(rect?.left);
          const top = Number(rect?.top);
          const width = Number(rect?.width);
          const height = Number(rect?.height);
          if (!Number.isFinite(left) || !Number.isFinite(top) || !width || !height) {
            finish(null);
            return;
          }
          finish({ left, top, width, height });
        })
        .exec();
    } catch {
      finish(null);
    }
  });
}
