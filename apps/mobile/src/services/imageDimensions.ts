type ImageWithRatio = { image: string; ratio: string };

const ratioCache = new Map<string, string>();

function getImageRatio(src: string) {
  const cached = ratioCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise<string | undefined>((resolve) => {
    uni.getImageInfo({
      src,
      success: (info) => {
        if (!info.width || !info.height) return resolve(undefined);
        const ratio = `${info.width}:${info.height}`;
        ratioCache.set(src, ratio);
        resolve(ratio);
      },
      fail: () => resolve(undefined)
    });
  });
}

export async function hydrateImageRatios<T extends ImageWithRatio>(items: T[]) {
  return Promise.all(
    items.map(async (item) => {
      const ratio = await getImageRatio(item.image);
      return ratio ? { ...item, ratio } : item;
    })
  );
}
