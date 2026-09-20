import type { AdapterContext, AdapterKind, NormalizedRequest, ProviderAdapter } from "../engine.types";
import { AsyncHttpAdapter } from "./async-http.adapter";
import { GeminiAdapter } from "./gemini.adapter";
import { OpenAiImagesAdapter } from "./openai-images.adapter";
import { asRecord } from "./adapter-http";

export { adapterMetadata, findAdapterMetadata, ADAPTER_KINDS, type AdapterMetaEntry } from "./adapter-metadata";

/** 回调用它定位任务，因此只能按常见字段名取，不能依赖某个平台的响应结构。 */
export function callbackTaskId(payload: unknown): string {
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const found = [data?.taskId, record?.taskId, data?.task_id, record?.task_id, data?.id, record?.id]
    .find((item) => typeof item === "string" && item.trim());
  return typeof found === "string" ? found.trim() : "";
}

const openai = new OpenAiImagesAdapter();
const gemini = new GeminiAdapter();
const syncHttp = new AsyncHttpAdapter("sync");
const asyncHttp = new AsyncHttpAdapter("async");

/**
 * 适配器注册表：kind → 适配器实例。全引擎只有这一处分支。
 * 未知协议收敛到通用 HTTP，避免历史配置行让任务直接崩掉。
 */
export function resolveAdapter(kind: AdapterKind, requestMode: "sync" | "async"): ProviderAdapter {
  switch (kind) {
    case "openai-images": return openai;
    case "gemini": return gemini;
    default: return requestMode === "sync" ? syncHttp : asyncHttp;
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
