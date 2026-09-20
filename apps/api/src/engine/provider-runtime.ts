export type ProviderRequestParams = Record<string, string>;
export type ProviderJsonObject = Record<string, unknown>;

export function normalizeProviderParams(value: unknown): ProviderRequestParams {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined && item !== null && String(item).trim())
      .map(([key, item]) => [key, String(item).trim()])
  );
}

export function normalizeProviderJsonObject(value: unknown): ProviderJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as ProviderJsonObject;
}

/** 上游任务名：图生图可单独命名（部分平台一个模型两个任务名），留空沿用模型名。 */
export function resolveModelTaskName(
  model: { providerModel: string; providerModelImage?: string | null },
  operation: "text-to-image" | "image-to-image"
): string {
  return operation === "image-to-image" ? model.providerModelImage?.trim() || model.providerModel : model.providerModel;
}
