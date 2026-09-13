import { ConfigService } from "@nestjs/config";
import type { AdapterContext, AdapterKind, NormalizedRequest, ProviderAdapter } from "../engine.types";
import { resolveAdapterKind } from "../provider-config";
import { AsyncHttpAdapter } from "./async-http.adapter";
import { GeminiAdapter } from "./gemini.adapter";
import { KieAdapter } from "./kie.adapter";
import { OpenAiImagesAdapter } from "./openai-images.adapter";

export { extractImageUrls, mapKieState } from "./kie.adapter";

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

/** admin 元数据：供配置界面动态渲染字段与默认值，枚举永远同源。 */
export function adapterMetadata() {
  return [
    {
      kind: "openai-images" as const,
      label: "OpenAI Images 协议",
      requestMode: "sync" as const,
      description: "OpenAI /v1/images/generations、/v1/images/edits 同步协议及兼容聚合平台",
      requiredFields: ["baseUrl"],
      optionalFields: ["imageEndpoint", "responseMapping", "requestParams", "imageRequestParams", "imageInputMode", "imageInputField", "sizeMode", "pixelSizeField", "textResultMode", "imageResultMode"],
      defaults: { requestMode: "sync", textResultMode: "url", imageResultMode: "auto", authMode: "bearer", imageInputMode: "multipart", imageInputField: "image", sizeMode: "pixels", pixelSizeField: "size" }
    },
    {
      kind: "gemini" as const,
      label: "Gemini generateContent 协议",
      requestMode: "sync" as const,
      description: "Google Gemini :generateContent 图像协议，参考图以内联 base64 传递",
      requiredFields: ["baseUrl"],
      optionalFields: ["requestParams", "sizeMode", "resolutionField", "ratioField", "textResultMode", "imageResultMode"],
      defaults: { requestMode: "sync", textResultMode: "base64", imageResultMode: "base64", authMode: "raw", authHeaderName: "x-goog-api-key", sizeMode: "ratio-resolution", ratioField: "aspectRatio", resolutionField: "imageSize" }
    },
    {
      kind: "kie" as const,
      label: "KIE 任务协议",
      requestMode: "async" as const,
      description: "KIE createTask/recordInfo 异步任务协议，支持回调",
      requiredFields: ["baseUrl"],
      optionalFields: ["queryEndpoint", "responseMapping", "requestParams", "imageRequestParams", "statusEnabled"],
      defaults: { requestMode: "async", textResultMode: "url", imageResultMode: "url", authMode: "bearer", queryEndpoint: "{baseUrl}/api/v1/jobs/recordInfo" }
    },
    {
      kind: "async-http" as const,
      label: "通用 HTTP（模板 + 轮询）",
      requestMode: "sync" as const,
      description: "请求模板 + 响应映射驱动，接入新的提交/轮询型平台无需写代码",
      requiredFields: ["baseUrl"],
      optionalFields: ["imageEndpoint", "queryEndpoint", "requestTemplate", "imageRequestTemplate", "responseMapping", "requestParams", "imageRequestParams", "imageInputMode", "imageInputField", "sizeMode", "pixelSizeField", "ratioField", "resolutionField", "statusEnabled", "authMode", "authHeaderName", "authQueryName", "requestHeaders", "queryHeaders", "injectModel", "injectCount"],
      defaults: { requestMode: "async", textResultMode: "url", imageResultMode: "url", authMode: "bearer", imageInputMode: "url-array", imageInputField: "image_urls", sizeMode: "pixels", pixelSizeField: "size", injectModel: true, injectCount: true }
    }
  ];
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
