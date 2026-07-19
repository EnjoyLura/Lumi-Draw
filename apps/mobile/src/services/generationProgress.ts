export const GENERATION_PROGRESS_STAGES = [
  "正在打草稿",
  "正在生成初稿",
  "正在构思画面",
  "正在润饰细节",
  "即将完成",
  "正在润色",
  "最后调整一下"
] as const;

const STAGE_THRESHOLDS = [12, 27, 43, 61, 76, 90] as const;

export function generationDurationSeconds(quality: string) {
  const normalized = quality.trim().toUpperCase();
  if (/4\s*K/.test(normalized) || /(?:3840|4096)(?:PX)?/.test(normalized)) return 120;
  if (/2\s*K/.test(normalized) || /(?:2048|2560)(?:PX)?/.test(normalized)) return 80;
  if (/1\s*K/.test(normalized) || /1024(?:PX)?/.test(normalized)) return 60;
  return 80;
}

export function generationStageForPercent(percent: number) {
  const index = STAGE_THRESHOLDS.findIndex((threshold) => percent < threshold);
  return GENERATION_PROGRESS_STAGES[index < 0 ? GENERATION_PROGRESS_STAGES.length - 1 : index];
}

export function simulateGenerationProgress(elapsedSeconds: number, quality: string, status?: string) {
  const duration = generationDurationSeconds(quality);
  const elapsed = Math.max(0, elapsedSeconds);
  const ratio = Math.min(elapsed / duration, 1);
  const easedRatio = 1 - Math.pow(1 - ratio, 1.25);
  let percent = 2 + Math.floor(93 * easedRatio);

  if (elapsed > duration) percent = 95 + Math.min(4, Math.floor((elapsed - duration) / 20));
  if (status === "finalizing") percent = Math.max(percent, 98);

  percent = Math.max(2, Math.min(percent, 99));
  return { percent, stage: generationStageForPercent(percent), duration };
}

export function mergeGenerationProgress(
  elapsedSeconds: number,
  quality: string,
  status: string | undefined,
  backendProgress = 0
) {
  const simulated = simulateGenerationProgress(elapsedSeconds, quality, status);
  const percent = Math.min(99, Math.max(simulated.percent, Number.isFinite(backendProgress) ? backendProgress : 0));
  return { ...simulated, percent, stage: generationStageForPercent(percent) };
}
