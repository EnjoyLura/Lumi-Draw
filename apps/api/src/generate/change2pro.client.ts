import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { spawn } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
const GENERATION_TIMEOUT_MS = 30 * 60 * 1000;
const IMAGE_2_SIZES: Record<string, Record<"1K" | "2K" | "4K", string>> = {
  "1:1": { "1K": "1024x1024", "2K": "2048x2048", "4K": "2880x2880" },
  "3:2": { "1K": "1536x1024", "2K": "2048x1360", "4K": "3520x2336" },
  "2:3": { "1K": "1024x1536", "2K": "1360x2048", "4K": "2336x3520" },
  "4:3": { "1K": "1024x768", "2K": "2048x1536", "4K": "3312x2480" },
  "3:4": { "1K": "768x1024", "2K": "1536x2048", "4K": "2480x3312" },
  "5:4": { "1K": "1280x1024", "2K": "2560x2048", "4K": "3216x2576" },
  "4:5": { "1K": "1024x1280", "2K": "2048x2560", "4K": "2576x3216" },
  "16:9": { "1K": "1536x864", "2K": "2048x1152", "4K": "3840x2160" },
  "9:16": { "1K": "864x1536", "2K": "1152x2048", "4K": "2160x3840" },
  "2:1": { "1K": "2048x1024", "2K": "2688x1344", "4K": "3840x1920" },
  "1:2": { "1K": "1024x2048", "2K": "1344x2688", "4K": "1920x3840" },
  "3:1": { "1K": "1536x512", "2K": "3072x1024", "4K": "3840x1280" },
  "1:3": { "1K": "512x1536", "2K": "1024x3072", "4K": "1280x3840" },
  "21:9": { "1K": "2016x864", "2K": "2688x1152", "4K": "3840x1648" },
  "9:21": { "1K": "864x2016", "2K": "1152x2688", "4K": "1648x3840" }
};

export function resolveChange2ProModel(modelId: string) {
  if (modelId === IMAGE_2_MODEL_ID) return { kind: "image2" as const, providerModel: "gpt-image-2" };
  if (modelId === BANANA_MODEL_ID) return { kind: "banana" as const, providerModel: BANANA_PROVIDER_MODEL };
  if (modelId === BANANA_PRO_MODEL_ID) return { kind: "banana" as const, providerModel: BANANA_PRO_PROVIDER_MODEL };
  return undefined;
}

export function normalizeImage2Size(ratio: string, quality: string) {
  const tier = (quality.match(/\b(1K|2K|4K)\b/i)?.[1]?.toUpperCase() ?? "1K") as "1K" | "2K" | "4K";
  const size = IMAGE_2_SIZES[ratio]?.[tier];
  if (!size) throw new BadRequestException("当前模型不支持所选图片尺寸");
  return size;
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
  private readonly logger = new Logger(Change2ProClient.name);

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
    let payload: Record<string, unknown>;

    if (input.mode === "image-to-image") {
      const reference = await this.downloadReferenceImage(input.inputImageUrl);
      payload = await this.requestImage2Form(this.image2Endpoint(config.apiBase, endpoint), config.imageApiKey, input, reference);
    } else {
      payload = await this.requestImage2Json(this.image2Endpoint(config.apiBase, endpoint), config.imageApiKey, input.jobId, {
        model: "gpt-image-2",
        prompt: input.prompt,
        n: input.count,
        size: normalizeImage2Size(input.ratio, input.quality),
        quality: "high",
        moderation: "low",
        output_format: "png",
        transparent_output: false,
        response_format: "url"
      });
    }

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

  private async requestImage2Json(url: string, apiKey: string, requestId: string, payload: Record<string, unknown>) {
    return this.requestImage2WithCurl(url, apiKey, requestId, async (temp) => {
      const payloadPath = join(temp, "payload.json");
      await writeFile(payloadPath, JSON.stringify(payload), "utf8");
      return ["--header", "Content-Type: application/json", "--data-binary", `@${payloadPath}`];
    });
  }

  private async requestImage2Form(
    url: string,
    apiKey: string,
    input: Change2ProGenerateInput,
    reference: { buffer: Buffer; contentType: string }
  ) {
    return this.requestImage2WithCurl(url, apiKey, input.jobId, async (temp) => {
      const referencePath = join(temp, `reference.${this.extension(reference.contentType)}`);
      await writeFile(referencePath, reference.buffer);
      return [
        "--form-string", "model=gpt-image-2",
        "--form-string", `prompt=${input.prompt}`,
        "--form-string", `n=${input.count}`,
        "--form-string", `size=${normalizeImage2Size(input.ratio, input.quality)}`,
        "--form-string", "quality=high",
        "--form-string", "input_fidelity=high",
        "--form-string", "moderation=low",
        "--form-string", "output_format=png",
        "--form-string", "transparent_output=false",
        "--form-string", "response_format=url",
        "--form", `image=@${referencePath};type=${reference.contentType}`
      ];
    });
  }

  private async requestImage2WithCurl(
    url: string,
    apiKey: string,
    requestId: string,
    buildRequestArgs: (temp: string) => Promise<string[]>
  ) {
    const temp = await mkdtemp(join(tmpdir(), "lumi-image2-"));
    try {
      const responsePath = join(temp, "response.json");
      const configPath = join(temp, "curl.conf");
      const headerPath = join(temp, "response.headers");
      await writeFile(
        configPath,
        [
          `header = "${this.escapeCurlHeader(`Authorization: Bearer ${apiKey}`)}"`,
          'header = "Accept: application/json"',
          `header = "${this.escapeCurlHeader(`X-Request-Id: ${requestId}`)}"`
        ].join("\n") + "\n",
        "utf8"
      );
      await chmod(configPath, 0o600);
      const requestArgs = await buildRequestArgs(temp);
      const result = await this.runCurlUntilJson(
        [
          "--silent", "--show-error", "--location", "--http1.1", "--max-time", String(GENERATION_TIMEOUT_MS / 1000),
          "--config", configPath, "--request", "POST", ...requestArgs,
          "--dump-header", headerPath, "--output", responsePath, "--write-out", "%{http_code}", url
        ],
        responsePath,
        headerPath
      );
      const curlError = result.error;
      const status = result.status;
      if (!Number.isFinite(status)) {
        this.logger.warn(`Change2Pro curl request failed: ${curlError.slice(0, 500)}`);
        throw new Error("生成服务连接失败，请稍后重试");
      }
      const payload = result.payload;
      return this.validateJsonResponse(status, payload);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error("生成服务返回异常，请稍后重试");
      throw error;
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  }

  private escapeCurlHeader(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, "");
  }

  private async runCurlUntilJson(args: string[], responsePath: string, headerPath: string) {
    const child = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });

    const exited = new Promise<void>((resolve) => {
      child.once("close", () => resolve());
      child.once("error", (error) => {
        stderr += error.message;
        resolve();
      });
    });

    const startedAt = Date.now();
    while (Date.now() - startedAt < GENERATION_TIMEOUT_MS) {
      const headers = await readFile(headerPath, "utf8").catch(() => "");
      const status = this.lastHttpStatus(headers);
      const raw = await readFile(responsePath, "utf8").catch(() => "");
      if (status && raw) {
        try {
          const payload = JSON.parse(raw) as Record<string, unknown>;
          child.kill("SIGTERM");
          await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1_000))]);
          return { status, payload, error: "" };
        } catch {
          // The provider is still writing the response body.
        }
      }

      const completed = await Promise.race([
        exited.then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 250))
      ]);
      if (completed) {
        const raw = await readFile(responsePath, "utf8").catch(() => "");
        const status = Number.parseInt(stdout.trim().slice(-3), 10) || this.lastHttpStatus(await readFile(headerPath, "utf8").catch(() => ""));
        return { status: status || Number.NaN, payload: raw ? (JSON.parse(raw) as Record<string, unknown>) : null, error: stderr || "curl request failed" };
      }
    }

    child.kill("SIGTERM");
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1_000))]);
    return { status: Number.NaN, payload: null, error: "curl request timed out" };
  }

  private lastHttpStatus(headers: string) {
    const statuses = [...headers.matchAll(/HTTP\/\d(?:\.\d)?\s+(\d{3})/g)].map((match) => Number.parseInt(match[1] || "", 10));
    return statuses.at(-1) || 0;
  }

  private image2Endpoint(apiBase: string, path: string) {
    const base = apiBase.replace(/\/$/, "");
    const versionedBase = base.endsWith("/v1") ? base : `${base}/v1`;
    return `${versionedBase}${path}`;
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
        signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS)
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
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (error instanceof Error && /timeout|aborted/i.test(error.message)) throw new Error("生成等待超时，积分已退还，请稍后重试");
      throw new Error("生成服务连接失败，积分已退还，请稍后重试");
    }
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return this.validateJsonResponse(response.status, payload);
  }

  private validateJsonResponse(status: number, payload: Record<string, unknown> | null) {
    if (status < 200 || status >= 300 || !payload) {
      const error = this.asRecord(payload?.error);
      const message = String(error?.message ?? payload?.message ?? payload?.error ?? `HTTP ${status}`);
      this.logger.warn(`Change2Pro request failed (HTTP ${status}): ${message.slice(0, 500)}`);
      if (status === 451 || /unsafe|safety|content.*(?:policy|filter)|不安全|违规|敏感/i.test(message)) {
        throw new Error("内容可能不安全，请修改提示词重试");
      }
      if (/尺寸|size|最长边|pixel/i.test(message)) throw new Error("当前模型不支持所选图片尺寸，积分已退还");
      if (status === 429) throw new Error("当前生成任务较多，积分已退还，请稍后重试");
      throw new Error("图片生成失败，积分已退还，请稍后重试");
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
