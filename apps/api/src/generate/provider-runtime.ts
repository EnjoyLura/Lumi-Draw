import type { ProviderSizeConfig } from "../common/provider-size";
import type { ProviderResultUrlRewriteRule } from "../common/provider-result-url";

export type ProviderRequestParams = Record<string, string>;
export type ProviderAuthMode = "bearer" | "raw" | "query" | "none";
export type ProviderJsonObject = Record<string, unknown>;

export interface ProviderRuntimeConfig {
  adapter?: "ainb" | "generic" | "change2pro" | "kie";
  apiBase: string;
  apiKey: string;
  params: ProviderRequestParams;
  requestMode?: "sync" | "async";
  resultMode?: "auto" | "url" | "base64";
  queryEndpoint?: string;
  statusEnabled?: boolean;
  responseMapping?: ProviderRequestParams;
  sizeConfig?: ProviderSizeConfig;
  imageInputMode?: "multipart" | "url" | "url-array";
  imageInputField?: string;
  resultUrlRewriteRules?: ProviderResultUrlRewriteRule[];
  authMode?: ProviderAuthMode;
  authHeaderName?: string;
  authQueryName?: string;
  requestHeaders?: ProviderRequestParams;
  queryHeaders?: ProviderRequestParams;
  requestTemplate?: ProviderJsonObject;
  injectModel?: boolean;
  injectCount?: boolean;
}

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

export function pickProviderParams(params: ProviderRequestParams, keys: string[]) {
  return Object.fromEntries(keys.filter((key) => params[key]).map((key) => {
    const value = params[key];
    return [key, key === "output_compression" && Number.isFinite(Number(value)) ? Number(value) : value];
  }));
}
