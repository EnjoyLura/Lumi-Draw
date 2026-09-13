import { BadRequestException } from "@nestjs/common";
import { resolveGeneratedImageSize } from "./generated-image-size";

export type ProviderSizeMode = "pixels" | "ratio-resolution";

export type ProviderSizeConfig = {
  mode: ProviderSizeMode;
  pixelSizeField: string;
  ratioField: string;
  resolutionField: string;
};

export const DEFAULT_PROVIDER_SIZE_CONFIG: ProviderSizeConfig = {
  mode: "pixels",
  pixelSizeField: "size",
  ratioField: "size",
  resolutionField: "resolution"
};

export function normalizeProviderSizeConfig(value?: Partial<ProviderSizeConfig>): ProviderSizeConfig {
  return {
    mode: value?.mode === "ratio-resolution" ? "ratio-resolution" : "pixels",
    pixelSizeField: String(value?.pixelSizeField || "size").trim(),
    ratioField: String(value?.ratioField || "size").trim(),
    resolutionField: String(value?.resolutionField || "resolution").trim()
  };
}

export function normalizeProviderResolution(quality: string) {
  return quality.match(/\b(1K|2K|4K)\b/i)?.[1]?.toLowerCase() ?? "1k";
}

export function buildProviderSizeParams(
  ratio: string,
  quality: string,
  pixelSize: string,
  configValue?: Partial<ProviderSizeConfig>
): Record<string, string> {
  const config = normalizeProviderSizeConfig(configValue);
  if (config.mode === "ratio-resolution") {
    return {
      [config.ratioField]: ratio,
      [config.resolutionField]: normalizeProviderResolution(quality)
    };
  }
  return { [config.pixelSizeField]: pixelSize };
}

/** 比例+精度 → OpenAI Images 风格的 "宽x高" 像素值；不支持时抛 invalid_request。 */
export function normalizeImage2Size(ratio: string, quality: string) {
  const size = resolveGeneratedImageSize(ratio, quality);
  if (!size) throw new BadRequestException("当前模型不支持所选图片尺寸");
  return `${size.width}x${size.height}`;
}
