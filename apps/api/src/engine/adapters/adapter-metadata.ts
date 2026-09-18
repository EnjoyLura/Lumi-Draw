import type { AdapterKind } from "../engine.types";

/**
 * 适配器注册元数据（纯数据，无适配器类依赖）。
 * admin 配置界面用它动态渲染字段与默认值；provider-config 用它做配置默认值合并。
 * 枚举永远同源：新增协议族只改这一处 + adapters/index.ts 的注册表。
 */
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

export type AdapterMetaEntry = ReturnType<typeof adapterMetadata>[number];

export function findAdapterMetadata(kind: string): AdapterMetaEntry | undefined {
  return adapterMetadata().find((entry) => entry.kind === kind);
}

export const ADAPTER_KINDS: AdapterKind[] = ["openai-images", "gemini", "kie", "async-http"];
