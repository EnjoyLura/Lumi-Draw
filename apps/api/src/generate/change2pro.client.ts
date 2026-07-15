import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type Change2ProConfig = {
  apiBase: string;
  imageApiKey: string;
  bananaApiKey: string;
};

type OssReferenceConfig = {
  bucket: string;
  endpoint: string;
  cdnBaseUrl?: string;
};

export type Change2ProGenerateInput = {
  jobId: string;
  modelId: string;
  mode: string;
  prompt: string;
  inputImageUrl: string;
  ratio: string;
  quality: string;
  count: number;
};

export type Change2ProOutput = {
  url?: string;
  buffer?: Buffer;
  contentType?: string;
};

const IMAGE_2_MODEL_ID = "gpt-image-2";
const BANANA_MODEL_ID = "nano-banana-2";
const BANANA_PROVIDER_MODEL = "gemini-3.1-flash-image-preview";
const BANANA_PRO_MODEL_ID = "nano-banana-pro";
const BANANA_PRO_PROVIDER_MODEL = "gemini-3-pro-image-preview";
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_REFERENCE_BYTES = 30 * 1024 * 1024;

export function resolveChange2ProModel(modelId: string) {
  if (modelId === IMAGE_2_MODEL_ID) return { kind: "image2" as const, providerModel: "gpt-image-2" };
  if (modelId === BANANA_MODEL_ID) return { kind: "banana" as const, providerModel: BANANA_PROVIDER_MODEL };
  if (modelId === BANANA_PRO_MODEL_ID) return { kind: "banana" as const, providerModel: BANANA_PRO_PROVIDER_MODEL };
  return undefined;
}

export function normalizeImage2Size(ratio: string) {
  const [width, height] = ratio.split(":").map(Number);
  if (!width || !height) return "1024x1024";
  const value = width / height;
  if (value > 1.15) return "1536x1024";
  if (value < 0.87) return "1024x1536";
  return "1024x1024";
}

function normalizeBananaQuality(quality: string) {
  return quality.match(/\b(1K|2K|4K)\b/i)?.[1]?.toUpperCase() ?? "1K";
}

function normalizeBananaRatio(ratio: string) {
  const supported = new Set(["21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"]);
  return supported.has(ratio) ? ratio : "1:1";
}

@Injectable()
export class Change2ProClient {
  constructor(private readonly config: ConfigService) {}

  isConfiguredFor(modelId: string) {
    const route = resolveChange2ProModel(modelId);
    const config = this.getConfig();
    if (route?.kind === "image2") return Boolean(config.apiBase && config.imageApiKey);
    if (route?.kind === "banana") return Boolean(config.apiBase && config.bananaApiKey);
    return false;
  }

  providerModel(modelId: string) {
    return resolveChange2ProModel(modelId)?.providerModel;
  }

  async generate(input: Change2ProGenerateInput): Promise<Change2ProOutput[]> {
    const route = resolveChange2ProModel(input.modelId);
    if (!route || !this.isConfiguredFor(input.modelId)) throw new Error("Change2Pro provider is not configured for this model");
    if (input.mode === "image-to-image" && !input.inputImageUrl) throw new BadRequestException("图生图需要参考图");
    return route.kind === "image2" ? this.generateImage2(input) : this.generateBanana(input, route.providerModel);
  }

  private async generateImage2(input: Change2ProGenerateInput): Promise<Change2ProOutput[]> {
    const config = this.getConfig();
    const endpoint = input.mode === "image-to-image" ? "/images/edits" : "/images/generations";
    let body: string | FormData;
    let headers: Record<string, string> = { Authorization: `Bearer ${config.imageApiKey}`, Accept: "application/json" };

    if (input.mode === "image-to-image") {
      const reference = await this.downloadReferenceImage(input.inputImageUrl);
      const form = new FormData();
      form.set("model", "gpt-image-2");
      form.set("prompt", input.prompt);
      form.set("n", String(input.count));
      form.set("size", normalizeImage2Size(input.ratio));
      form.set("image", new Blob([reference.buffer], { type: reference.contentType }), `reference.${this.extension(reference.contentType)}`);
      body = form;
    } else {
      headers = { ...headers, "Content-Type": "application/json" };
      body = JSON.stringify({
        model: "gpt-image-2",
        prompt: input.prompt,
        n: input.count,
        size: normalizeImage2Size(input.ratio)
      });
    }

    const payload = await this.requestJson(`${config.apiBase}${endpoint}`, {
      method: "POST",
      headers: { ...headers, "X-Request-Id": input.jobId },
      body,
      signal: AbortSignal.timeout(300_000)
    });
    const data = Array.isArray(payload.data) ? payload.data : [];
    const outputs: Change2ProOutput[] = [];
    data.forEach((item) => {
      const record = this.asRecord(item);
      if (typeof record?.url === "string") outputs.push({ url: record.url });
      else if (typeof record?.b64_json === "string") outputs.push({ buffer: Buffer.from(record.b64_json, "base64"), contentType: "image/png" });
    });
    if (!outputs.length) throw new Error("Image 2 response did not include an image");
    return outputs;
  }

  private async generateBanana(input: Change2ProGenerateInput, providerModel: string) {
    const config = this.getConfig();
    const reference = input.mode === "image-to-image" ? await this.downloadReferenceImage(input.inputImageUrl) : undefined;
    const outputs: Change2ProOutput[] = [];

    for (let index = 0; index < input.count; index += 1) {
      const parts: Array<Record<string, unknown>> = [{ text: input.prompt }];
      if (reference) {
        parts.push({ inlineData: { mimeType: reference.contentType, data: reference.buffer.toString("base64") } });
      }
      const payload = await this.requestJson(`${config.apiBase}/v1beta/models/${encodeURIComponent(providerModel)}:generateContent`, {
        method: "POST",
        headers: {
          "x-goog-api-key": config.bananaApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Request-Id": input.count > 1 ? `${input.jobId}-${index + 1}` : input.jobId
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            imageConfig: {
              imageSize: normalizeBananaQuality(input.quality),
              aspectRatio: normalizeBananaRatio(input.ratio)
            }
          }
        }),
        signal: AbortSignal.timeout(300_000)
      });
      outputs.push(...this.extractBananaOutputs(payload));
    }

    if (!outputs.length) throw new Error("Banana response did not include an image");
    return outputs;
  }

  private extractBananaOutputs(payload: Record<string, unknown>) {
    const outputs: Change2ProOutput[] = [];
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
    for (const candidate of candidates) {
      const content = this.asRecord(this.asRecord(candidate)?.content);
      const parts = Array.isArray(content?.parts) ? content.parts : [];
      for (const part of parts) {
        const record = this.asRecord(part);
        const inlineData = this.asRecord(record?.inlineData ?? record?.inline_data);
        const data = inlineData?.data;
        const contentType = String(inlineData?.mimeType ?? inlineData?.mime_type ?? "image/png").toLowerCase();
        if (typeof data === "string" && ALLOWED_IMAGE_TYPES.has(contentType)) {
          outputs.push({ buffer: Buffer.from(data, "base64"), contentType });
        }
      }
    }
    return outputs;
  }

  private async downloadReferenceImage(sourceUrl: string) {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" || !this.allowedReferenceHosts().has(url.hostname.toLowerCase())) {
      throw new BadRequestException("参考图地址无效");
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new BadRequestException(`参考图下载失败（${response.status}）`);
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || "";
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw new BadRequestException("参考图格式仅支持 PNG、JPG 或 WEBP");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.byteLength > MAX_REFERENCE_BYTES) throw new BadRequestException("参考图大小无效");
    return { buffer, contentType };
  }

  private async requestJson(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || !payload) {
      const error = this.asRecord(payload?.error);
      const message = String(error?.message ?? payload?.message ?? payload?.error ?? `HTTP ${response.status}`);
      throw new Error(`Change2Pro request failed: ${message}`);
    }
    return payload;
  }

  private getConfig() {
    const value = this.config.get<Change2ProConfig>("app.change2pro");
    return {
      apiBase: (value?.apiBase || "https://api.change2pro.com").replace(/\/$/, ""),
      imageApiKey: value?.imageApiKey || "",
      bananaApiKey: value?.bananaApiKey || ""
    };
  }

  private allowedReferenceHosts() {
    const oss = this.config.get<OssReferenceConfig>("app.oss");
    const hosts = new Set<string>();
    if (oss?.bucket && oss.endpoint) hosts.add(`${oss.bucket}.${oss.endpoint}`.toLowerCase());
    if (oss?.cdnBaseUrl) {
      try {
        hosts.add(new URL(oss.cdnBaseUrl).hostname.toLowerCase());
      } catch {
        // Invalid CDN config is handled by the upload service; it must not widen this allowlist.
      }
    }
    return hosts;
  }

  private extension(contentType: string) {
    if (contentType === "image/jpeg") return "jpg";
    if (contentType === "image/webp") return "webp";
    return "png";
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    return undefined;
  }
}
