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
      optionalFields: ["imageEndpoint", "requestParams", "imageRequestParams", "imageInputMode", "imageInputField", "sizeMode", "pixelSizeField", "resultUrlRewriteRules"],
      defaults: { requestMode: "sync", authMode: "bearer", imageInputMode: "multipart", imageInputField: "image", sizeMode: "pixels", pixelSizeField: "size" }
    },
    {
      kind: "gemini" as const,
      label: "Gemini generateContent 协议",
      requestMode: "sync" as const,
      description: "Google Gemini :generateContent 图像协议，参考图以内联 base64 传递",
      requiredFields: ["baseUrl"],
      optionalFields: ["requestParams", "ratioField", "resolutionField", "resultUrlRewriteRules"],
      defaults: { requestMode: "sync", authMode: "raw", authHeaderName: "x-goog-api-key", sizeMode: "ratio-resolution", ratioField: "aspectRatio", resolutionField: "imageSize" }
    },
    {
      kind: "async-http" as const,
      label: "通用 HTTP（模板 + 轮询）",
      requestMode: "sync" as const,
      description: "请求模板 + 响应字段映射驱动，接入任何「提交即返回」或「提交 + 轮询/回调」型平台都无需改代码",
      requiredFields: ["baseUrl"],
      optionalFields: ["requestMode", "imageEndpoint", "queryEndpoint", "statusEnabled", "requestTemplate", "imageRequestTemplate", "responseMapping", "requestParams", "imageRequestParams", "imageInputMode", "imageInputField", "sizeMode", "pixelSizeField", "ratioField", "resolutionField", "authMode", "authHeaderName", "authQueryName", "requestHeaders", "queryHeaders", "injectModel", "injectCount", "resultUrlRewriteRules"],
      defaults: { requestMode: "async", authMode: "bearer", imageInputMode: "url-array", imageInputField: "image_urls", sizeMode: "pixels", pixelSizeField: "size", injectModel: true, injectCount: true }
    }
  ];
}

export type AdapterMetaEntry = ReturnType<typeof adapterMetadata>[number];

export function findAdapterMetadata(kind: string): AdapterMetaEntry | undefined {
  return adapterMetadata().find((entry) => entry.kind === kind);
}

export const ADAPTER_KINDS: AdapterKind[] = ["openai-images", "gemini", "async-http"];
