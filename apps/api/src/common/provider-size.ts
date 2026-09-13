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
