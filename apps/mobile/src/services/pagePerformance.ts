type MiniProgramPerformanceEntry = {
  duration?: number;
  entryType?: string;
  name?: string;
  startTime?: number;
};

type MiniProgramPerformance = {
  getEntriesByName?: (name: string) => MiniProgramPerformanceEntry[];
};

type MiniProgramRuntime = {
  getPerformance?: () => MiniProgramPerformance;
};

export function reportPageNavigationPerformance(page: string) {
  if (import.meta.env.MODE !== "development") return;

  // #ifdef MP-WEIXIN
  const runtime = (globalThis as typeof globalThis & { wx?: MiniProgramRuntime }).wx;
  const performance = runtime?.getPerformance?.();
  if (!performance?.getEntriesByName) return;

  const routeEntries = performance.getEntriesByName("route");
  const firstRenderEntries = performance.getEntriesByName("firstRender");
  const route = routeEntries[routeEntries.length - 1];
  const firstRender = firstRenderEntries[firstRenderEntries.length - 1];
  console.info(`[Lumi performance] ${page}`, { route, firstRender });
  // #endif
}
