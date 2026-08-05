export const PRIMARY_IMAGE_MODEL_NAME = "图像生成模型 V3.0";

const PRIVATE_PROVIDER_NAME_PATTERN =
  /(?:chat\s*gpt|openai|gpt(?:[-_\s]*image)?(?:[-_\s]*\d+(?:\.\d+)*)?)/i;
const PRIVATE_PROVIDER_TEXT_PATTERN =
  /(?:chat\s*gpt|openai|gpt(?:[-_\s]*image)?(?:[-_\s]*\d+(?:\.\d+)*)?)/gi;

export function toPublicModelName(value?: string | null, fallback = "AI 绘画") {
  const name = String(value || "").trim();
  if (!name) return fallback;
  return PRIVATE_PROVIDER_NAME_PATTERN.test(name) ? PRIMARY_IMAGE_MODEL_NAME : name;
}

export function sanitizePublicAiText(value?: string | null) {
  return String(value || "").replace(PRIVATE_PROVIDER_TEXT_PATTERN, PRIMARY_IMAGE_MODEL_NAME);
}
