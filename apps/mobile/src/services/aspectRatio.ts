const CANONICAL_RATIOS = [
  [1, 1],
  [2, 3],
  [3, 4],
  [4, 3],
  [3, 2],
  [9, 16],
  [16, 9]
] as const;

const CANONICAL_TOLERANCE = 0.025;
const ASPECT_RATIO_PATTERN = /^(\d+(?:\.\d+)?)\s*[:x/\u00d7]\s*(\d+(?:\.\d+)?)$/i;

export function normalizeAspectRatio(ratio?: string | null, fallback = "1:1") {
  const dimensions = parseAspectRatio(ratio);
  if (!dimensions) return fallback;
  return aspectRatioFromDimensions(dimensions.width, dimensions.height, fallback);
}

export function toCssAspectRatio(ratio?: string | null, fallback = "1 / 1") {
  const dimensions = parseAspectRatio(ratio);
  if (!dimensions) return fallback;
  return `${dimensions.width} / ${dimensions.height}`;
}

export function aspectRatioFromDimensions(width?: number, height?: number, fallback = "1:1") {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return fallback;
  }

  const target = width / height;
  const nearest = CANONICAL_RATIOS.reduce(
    (best, [ratioWidth, ratioHeight]) => {
      const difference = Math.abs(ratioWidth / ratioHeight - target);
      return difference < best.difference ? { ratioWidth, ratioHeight, difference } : best;
    },
    { ratioWidth: 1, ratioHeight: 1, difference: Number.POSITIVE_INFINITY }
  );

  if (nearest.difference / target <= CANONICAL_TOLERANCE) {
    return `${nearest.ratioWidth}:${nearest.ratioHeight}`;
  }

  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);
  const divisor = greatestCommonDivisor(roundedWidth, roundedHeight);
  return `${roundedWidth / divisor}:${roundedHeight / divisor}`;
}

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? left : greatestCommonDivisor(right, left % right);
}

function parseAspectRatio(ratio?: string | null) {
  if (!ratio) return null;
  const match = ratio.trim().match(ASPECT_RATIO_PATTERN);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}
