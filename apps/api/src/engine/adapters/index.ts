import type { AdapterContext, AdapterKind, NormalizedRequest, ProviderAdapter } from "../engine.types";
import { resolveAdapterKind } from "../provider-config";
import { AsyncHttpAdapter } from "./async-http.adapter";
import { GeminiAdapter } from "./gemini.adapter";
import { KieAdapter } from "./kie.adapter";
import { OpenAiImagesAdapter } from "./openai-images.adapter";

export { extractImageUrls, mapKieState } from "./kie.adapter";
export { adapterMetadata, findAdapterMetadata, ADAPTER_KINDS, type AdapterMetaEntry } from "./adapter-metadata";

export function kieCallbackTaskId(payload: unknown): string {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const data = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : {};
  return String(data.taskId ?? record.taskId ?? "");
}

const openai = new OpenAiImagesAdapter();
const gemini = new GeminiAdapter();
const kie = new KieAdapter();
const syncHttp = new AsyncHttpAdapter("sync");
const asyncHttp = new AsyncHttpAdapter("async");

/** 适配器注册表：kind → 适配器实例。全引擎只有这一处分支。 */
export function resolveAdapter(kind: AdapterKind, requestMode: "sync" | "async"): ProviderAdapter {
  switch (kind) {
    case "openai-images": return openai;
    case "gemini": return gemini;
    case "kie": return kie;
    case "async-http": return requestMode === "sync" ? syncHttp : asyncHttp;
  }
}

export function buildAdapterContext(options: {
  config: import("../engine.types").ProviderConfig;
  apiKey: string;
  callbackUrl: string;
  allowedReferenceHosts: string[];
}): AdapterContext {
  return options;
}

export type { AdapterContext, NormalizedRequest };
