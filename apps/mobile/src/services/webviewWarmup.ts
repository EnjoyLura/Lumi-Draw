type WechatRuntime = {
  preloadWebview?: () => void;
};

let warmupTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Reserve the next native WebView during idle time. This only affects
 * navigateTo-style pages; primary tabs stay in the single-page shell.
 */
export function warmupNextWebview() {
  if (warmupTimer) clearTimeout(warmupTimer);

  warmupTimer = setTimeout(() => {
    warmupTimer = undefined;
    // #ifdef MP-WEIXIN
    const runtime = (globalThis as typeof globalThis & { wx?: WechatRuntime }).wx;
    runtime?.preloadWebview?.();
    // #endif
  }, 300);
}
