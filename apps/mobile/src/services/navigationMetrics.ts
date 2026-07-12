export interface NavigationMetrics {
  statusBarHeight: number;
  navigationBarHeight: number;
  menuButtonLeft: number;
  windowWidth: number;
  bottomSafeArea: number;
}

export function getNavigationMetrics(): NavigationMetrics {
  const fallback = { statusBarHeight: 0, navigationBarHeight: 50, menuButtonLeft: 0, windowWidth: 0, bottomSafeArea: 0 };
  try {
    const systemInfo = uni.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight ?? 0;
    const getMenuRect = (uni as UniApp.Uni & {
      getMenuButtonBoundingClientRect?: () => { top: number; height: number; left: number };
    }).getMenuButtonBoundingClientRect;
    const menuRect = getMenuRect?.();
    if (!menuRect?.height) {
      return {
        ...fallback,
        statusBarHeight,
        windowWidth: systemInfo.windowWidth ?? 0,
        bottomSafeArea: systemInfo.safeAreaInsets?.bottom ?? Math.max(0, (systemInfo.screenHeight ?? 0) - (systemInfo.safeArea?.bottom ?? systemInfo.screenHeight ?? 0))
      };
    }
    return {
      statusBarHeight,
      navigationBarHeight: (menuRect.top - statusBarHeight) * 2 + menuRect.height,
      menuButtonLeft: menuRect.left,
      windowWidth: systemInfo.windowWidth ?? 0,
      bottomSafeArea: systemInfo.safeAreaInsets?.bottom ?? Math.max(0, (systemInfo.screenHeight ?? 0) - (systemInfo.safeArea?.bottom ?? systemInfo.screenHeight ?? 0))
    };
  } catch {
    return fallback;
  }
}
