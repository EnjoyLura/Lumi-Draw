export type ProviderRequestParams = Record<string, string>;

export interface ProviderRuntimeConfig {
  apiBase: string;
  apiKey: string;
  params: ProviderRequestParams;
}

export function normalizeProviderParams(value: unknown): ProviderRequestParams {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined && item !== null && String(item).trim())
      .map(([key, item]) => [key, String(item).trim()])
  );
}

export function pickProviderParams(params: ProviderRequestParams, keys: string[]) {
  return Object.fromEntries(keys.filter((key) => params[key]).map((key) => {
    const value = params[key];
    return [key, key === "output_compression" && Number.isFinite(Number(value)) ? Number(value) : value];
  }));
}
