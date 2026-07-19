const DETAIL_IMAGE_MIN_HEIGHT = 260;
const DETAIL_IMAGE_MAX_HEIGHT = 560;
const LANDSCAPE_MIN_HEIGHT_RPX = 640;

export function resolveWorkDetailImageHeight(ratio: string, windowWidth: number) {
  const [width, height] = ratio.split(":").map(Number);
  if (!width || !height || !windowWidth) return Math.min(DETAIL_IMAGE_MAX_HEIGHT, Math.max(DETAIL_IMAGE_MIN_HEIGHT, windowWidth));

  const ratioBasedHeight = (height / width) * windowWidth;
  const landscapeMinHeight = width > height ? (LANDSCAPE_MIN_HEIGHT_RPX / 750) * windowWidth : 0;
  return Math.min(DETAIL_IMAGE_MAX_HEIGHT, Math.max(DETAIL_IMAGE_MIN_HEIGHT, ratioBasedHeight, landscapeMinHeight));
}
