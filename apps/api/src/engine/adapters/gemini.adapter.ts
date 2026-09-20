import { firstStringAtPath } from "../../common/provider-response";
import { downloadReferenceImage, requestJson } from "./adapter-http";
import type {
  AdapterContext,
  AdapterOutput,
  AdapterSubmitResult,
  NormalizedRequest,
  ProviderAdapter
} from "../engine.types";

const SUBMIT_TIMEOUT_MS = 30 * 60_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SUPPORTED_RATIOS = new Set(["21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"]);

/**
 * Google Gemini generateContent 协议适配器（图像生成走 imageConfig，
 * 参考 图以内联 base64 传递）。单次请求只出一图，count>1 串行多次提交。
 */
export class GeminiAdapter implements ProviderAdapter {
  readonly kind = "gemini" as const;
  readonly requestMode = "sync" as const;

  async submit(ctx: AdapterContext, req: NormalizedRequest): Promise<AdapterSubmitResult> {
    const config = ctx.config;
    const endpoint = config.baseUrl.includes("{model}")
      ? config.baseUrl.replace("{model}", encodeURIComponent(req.providerModel))
      : `${(config.baseUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "")}/models/${encodeURIComponent(req.providerModel)}:generateContent`;
    const references: Array<{ buffer: Buffer; contentType: string }> = [];
    if (req.operation === "image-to-image") {
      if (!req.inputImageUrls.length) throw new Error("图生图需要参考图");
      references.push(...(await Promise.all(req.inputImageUrls.map((url) => downloadReferenceImage(url, ctx.allowedReferenceHosts)))));
    }
    const outputs: AdapterOutput[] = [];
    for (let index = 0; index < Math.max(1, req.count); index += 1) {
      const parts: Array<Record<string, unknown>> = [{ text: req.prompt }];
      references.forEach((reference) => {
        parts.push({ inlineData: { mimeType: reference.contentType, data: reference.buffer.toString("base64") } });
      });
      const imageConfig: Record<string, unknown> = {};
      Object.entries(req.params)
        .filter(([key]) => key !== "model")
        .forEach(([key, value]) => { imageConfig[key] = value; });
      imageConfig[config.resolutionField || "imageSize"] = req.quality.match(/\b(1K|2K|4K)\b/i)?.[1]?.toUpperCase() ?? "1K";
      imageConfig[config.ratioField || "aspectRatio"] = SUPPORTED_RATIOS.has(req.ratio) ? req.ratio : "1:1";
      const payload = await requestJson(endpoint, {
        method: "POST",
        headers: {
          "x-goog-api-key": ctx.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Request-Id": req.count > 1 ? `${req.attemptId}-${index + 1}` : req.attemptId
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { imageConfig }
        })
      }, { billed: true, timeoutMs: SUBMIT_TIMEOUT_MS, label: "gemini submit" });
      outputs.push(...this.extractOutputs(payload));
    }
    if (!outputs.length) throw new Error("Gemini 响应没有包含图片");
    return { outputs: outputs.slice(0, req.count) };
  }

  private extractOutputs(payload: Record<string, unknown>): AdapterOutput[] {
    const outputs: AdapterOutput[] = [];
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
    for (const candidate of candidates) {
      const content = (candidate as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
      const parts = Array.isArray(content?.parts) ? content.parts : [];
      for (const part of parts) {
        const record = part as Record<string, unknown>;
        const inline = (record.inlineData ?? record.inline_data) as Record<string, unknown> | undefined;
        const data = inline?.data;
        const contentType = String(inline?.mimeType ?? inline?.mime_type ?? "image/png").toLowerCase();
        if (typeof data === "string" && ALLOWED_IMAGE_TYPES.has(contentType)) {
          outputs.push({ buffer: Buffer.from(data, "base64"), contentType });
        }
      }
    }
    return outputs;
  }
}

export function geminiTextFromPayload(payload: Record<string, unknown>): string {
  const text = firstStringAtPath(payload, "candidates[].content.parts[].text");
  return text.trim();
}
