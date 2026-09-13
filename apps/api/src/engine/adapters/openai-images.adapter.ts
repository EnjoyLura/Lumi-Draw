import { normalizeImage2Size } from "../../generate/change2pro.client";
import { firstStringAtPath, stringValuesAtPath } from "../../common/provider-response";
import { buildProviderSizeParams, sizeParamKeys, requestJson, authHeaders, downloadReferenceImage, extensionFor } from "./adapter-http";
import type {
  AdapterContext,
  AdapterOutput,
  AdapterSubmitResult,
  NormalizedRequest,
  ProviderAdapter
} from "../engine.types";

const SUBMIT_TIMEOUT_MS = 30 * 60_000;

/**
 * OpenAI Images 协议适配器（/v1/images/generations、/v1/images/edits）。
 * 同步长请求，native fetch 直连（替代旧的 spawn curl 方案），支持多图并发。
 */
export class OpenAiImagesAdapter implements ProviderAdapter {
  readonly kind = "openai-images" as const;
  readonly requestMode = "sync" as const;

  async submit(ctx: AdapterContext, req: NormalizedRequest): Promise<AdapterSubmitResult> {
    const config = ctx.config;
    const endpoint = req.operation === "image-to-image"
      ? (config.imageEndpoint || this.defaultEditEndpoint(config.baseUrl))
      : config.baseUrl;
    const outputs: AdapterOutput[] = [];
    const requests = Array.from({ length: Math.max(1, req.count) }, (_, index) => index);

    const settled = await Promise.allSettled(requests.map((index) => this.requestOnce(ctx, req, endpoint, index)));
    const failures = settled.filter((item): item is PromiseRejectedResult => item.status === "rejected");
    for (const item of settled) {
      if (item.status === "fulfilled") outputs.push(...item.value);
    }
    if (!outputs.length) {
      const reason = failures[0]?.reason;
      if (reason instanceof Error) throw reason;
      throw new Error("图片生成失败");
    }
    return { outputs: outputs.slice(0, req.count) };
  }

  private async requestOnce(ctx: AdapterContext, req: NormalizedRequest, endpoint: string, index: number): Promise<AdapterOutput[]> {
    const config = ctx.config;
    const params = req.params;
    const sizeParams = buildProviderSizeParams(req.ratio, req.quality, req.pixelSize, config);
    const excluded = ["model", "prompt", "n", "image", "image[]", "image_urls", "reference_images", config.imageInputField, ...sizeParamKeys(config)];
    const extra = Object.fromEntries(
      Object.keys(params).filter((key) => !excluded.includes(key)).map((key) => [key, params[key]])
    );

    if (req.operation === "image-to-image" && config.imageInputMode === "url-array") {
      const payload = await requestJson(endpoint, {
        method: "POST",
        headers: { ...authHeaders(ctx.apiKey, config, { "Content-Type": "application/json; charset=utf-8" }), "X-Request-Id": `${req.attemptId}-${index + 1}` },
        body: JSON.stringify({
          ...extra,
          model: req.providerModel,
          prompt: req.prompt,
          n: 1,
          ...sizeParams,
          [config.imageInputField || "image_urls"]: req.inputImageUrls
        })
      }, { billed: true, timeoutMs: SUBMIT_TIMEOUT_MS, label: "openai-images submit" });
      return this.extractOutputs(payload, params, config);
    }

    if (req.operation === "image-to-image") {
      const references = await Promise.all(req.inputImageUrls.map((url) => downloadReferenceImage(url, ctx.allowedReferenceHosts)));
      const form = new FormData();
      form.append("model", req.providerModel);
      form.append("prompt", req.prompt);
      form.append("n", "1");
      Object.entries(sizeParams).forEach(([key, value]) => form.append(key, value));
      Object.entries(extra).forEach(([key, value]) => form.append(key, String(value)));
      references.forEach((reference, referenceIndex) => {
        form.append(
          config.imageInputField || "image[]",
          new Blob([reference.buffer], { type: reference.contentType }),
          `reference-${referenceIndex + 1}.${extensionFor(reference.contentType)}`
        );
      });
      const payload = await requestJson(endpoint, {
        method: "POST",
        headers: authHeaders(ctx.apiKey, config, { "X-Request-Id": `${req.attemptId}-${index + 1}` }),
        body: form
      }, { billed: true, timeoutMs: SUBMIT_TIMEOUT_MS, label: "openai-images submit" });
      return this.extractOutputs(payload, params, config);
    }

    const payload = await requestJson(endpoint, {
      method: "POST",
      headers: { ...authHeaders(ctx.apiKey, config, { "Content-Type": "application/json; charset=utf-8" }), "X-Request-Id": `${req.attemptId}-${index + 1}` },
      body: JSON.stringify({
        ...extra,
        model: req.providerModel,
        prompt: req.prompt,
        n: 1,
        ...sizeParams
      })
    }, { billed: true, timeoutMs: SUBMIT_TIMEOUT_MS, label: "openai-images submit" });
    return this.extractOutputs(payload, params, config);
  }

  private extractOutputs(payload: Record<string, unknown>, params: Record<string, string>, config: AdapterContext["config"]): AdapterOutput[] {
    const mapping = config.responseMapping;
    const fallbackContentType = this.contentType(String(params.output_format || "png"));
    const urls = stringValuesAtPath(payload, mapping.resultUrlPath || "data[].url").map((url) => ({ url }) as AdapterOutput);
    const base64 = stringValuesAtPath(payload, mapping.resultBase64Path || "data[].b64_json")
      .map((value) => ({ buffer: Buffer.from(value, "base64"), contentType: fallbackContentType }));
    const outputs = [...urls, ...base64];
    if (!outputs.length) throw new Error("上游响应没有包含图片");
    return outputs;
  }

  private contentType(format: string): string {
    const normalized = format.trim().toLowerCase();
    if (normalized === "jpg" || normalized === "jpeg") return "image/jpeg";
    if (normalized === "webp") return "image/webp";
    return "image/png";
  }

  /** baseUrl 是文生图完整 URL；图生图未单独配置时按 /generations→/edits 推导。 */
  private defaultEditEndpoint(baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/$/, "");
    if (trimmed.endsWith("/generations")) return `${trimmed.slice(0, -"/generations".length)}/edits`;
    return `${trimmed}/edits`;
  }
}

// 归一化尺寸校验沿用共享实现：不支持的尺寸在这里抛 invalid_request。
export function assertSupportedSize(ratio: string, quality: string): string {
  return normalizeImage2Size(ratio, quality);
}

export function resolvePixelSize(req: NormalizedRequest): string {
  return req.pixelSize || normalizeImage2Size(req.ratio, req.quality);
}

export function mappedTaskId(payload: unknown, mapping: Record<string, string>, fallbackKeys: string[]): string {
  const configured = mapping.taskIdPath ? firstStringAtPath(payload, mapping.taskIdPath) : "";
  if (configured) return configured;
  for (const key of fallbackKeys) {
    const value = firstStringAtPath(payload, key);
    if (value) return value;
  }
  return "";
}
