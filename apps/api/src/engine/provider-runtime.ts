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
