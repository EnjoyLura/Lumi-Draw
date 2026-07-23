type MiniProgramPerformanceEntry = {
  duration?: number;
  entryType?: string;
  moduleName?: string;
  name?: string;
  path?: string;
  startTime?: number;
};

type MiniProgramPerformance = {
  createObserver?: (callback: (entryList: { getEntries: () => MiniProgramPerformanceEntry[] }) => void) => {
    observe: (options: { entryTypes: string[] }) => void;
  };
  getEntriesByName?: (name: string) => MiniProgramPerformanceEntry[];
};

type MiniProgramRuntime = {
  getPerformance?: () => MiniProgramPerformance;
};

const entries: MiniProgramPerformanceEntry[] = [];
let observerInitialized = false;

export function initPagePerformanceMonitoring() {
  if (!import.meta.env.DEV) return;
  if (observerInitialized) return;

  // #ifdef MP-WEIXIN
  const runtime = (globalThis as typeof globalThis & { wx?: MiniProgramRuntime }).wx;
  const performance = runtime?.getPerformance?.();
  const observer = performance?.createObserver?.((entryList) => {
    entries.push(...entryList.getEntries());
    if (entries.length > 50) entries.splice(0, entries.length - 50);
  });
  if (!observer) return;
  observer.observe({ entryTypes: ["navigation", "render", "script"] });
  observerInitialized = true;
  // #endif
}

export function reportPageNavigationPerformance(page: string) {
  if (!import.meta.env.DEV) return;
  // #ifdef MP-WEIXIN
  if (!observerInitialized) {
    console.warn(`[Lumi performance] ${page}`, { supported: false });
    return;
  }

  const routeEntries = entries.filter((entry) => entry.name === "route");
  const firstRenderEntries = entries.filter((entry) => entry.name === "firstRender");
  const route = routeEntries[routeEntries.length - 1];
  const firstRender = firstRenderEntries[firstRenderEntries.length - 1];
  const routeStart = route?.startTime ?? 0;
  const routeEnd = routeStart + (route?.duration ?? 0);
  const scripts = entries.filter(
    (entry) =>
      entry.entryType === "script" &&
      typeof entry.startTime === "number" &&
      entry.startTime >= routeStart - 100 &&
      entry.startTime <= routeEnd
  );
  console.warn(`[Lumi performance] ${page}`, { route, firstRender, scripts });
  // #endif
}
