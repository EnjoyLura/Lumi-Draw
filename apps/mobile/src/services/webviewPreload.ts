type WechatRuntime = {
  preloadWebview?: () => void;
};

let preloadTimer: ReturnType<typeof setTimeout> | undefined;

export function preloadNextWebview() {
  if (preloadTimer) clearTimeout(preloadTimer);

  preloadTimer = setTimeout(() => {
    preloadTimer = undefined;
    // #ifdef MP-WEIXIN
    const runtime = (globalThis as typeof globalThis & { wx?: WechatRuntime }).wx;
    runtime?.preloadWebview?.();
    // #endif
  }, 0);
}
