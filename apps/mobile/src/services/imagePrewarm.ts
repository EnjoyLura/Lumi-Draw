/**
 * 图片空闲预热：用 uni.getImageInfo 把即将展示的图片提前拉进微信原生图片
 * 缓存，渲染时 <image> 直接命中本地。去重集合跨页面共享，队列 2 并发，
 * 全部失败静默（预热只是优化）。
 */
const warmedUrls = new Set<string>();

export function prewarmImages(urls: Array<string | undefined>, concurrency = 2) {
  const queue = urls
    .filter((url): url is string => Boolean(url))
    .filter((url) => !warmedUrls.has(url));
  queue.forEach((url) => warmedUrls.add(url));
  if (!queue.length) return;

  const worker = async () => {
    while (queue.length) {
      const src = queue.shift();
      if (!src) return;
      await new Promise<void>((resolve) => {
        uni.getImageInfo({ src, success: () => resolve(), fail: () => resolve() });
      });
    }
  };
  for (let index = 0; index < Math.min(concurrency, queue.length); index += 1) void worker();
}
