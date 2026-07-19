import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { normalizeImage2Size, type Change2ProOutput } from "./change2pro.client";
import { pickProviderParams, type ProviderRuntimeConfig } from "./provider-runtime";

type AinbConfig = {
  apiBase: string;
  endpoint?: string;
  imageApiKey: string;
  params: Record<string, string>;
  dynamicParams: boolean;
};

type AinbGenerateInput = {
  mode: string;
  prompt: string;
  inputImageUrl: string;
  ratio: string;
  quality: string;
  count: number;
};

const IMAGE_2_MODEL_ID = "gpt-image-2";
const BATCH_TASK_PREFIX = "ainb-batch:";
const POLL_INTERVAL_MS = 3_000;
const GENERATION_TIMEOUT_MS = 30 * 60 * 1_000;
const MAX_REFERENCE_BYTES = 30 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type OssReferenceConfig = {
  bucket: string;
  endpoint: string;
  cdnBaseUrl?: string;
};

type ReferenceImage = { buffer: Buffer; contentType: string };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return undefined;
}

@Injectable()
export class AinbClient {
  private readonly logger = new Logger(AinbClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfiguredFor(modelId: string, mode: string) {
    const config = this.getConfig();
    return modelId === IMAGE_2_MODEL_ID && ["text-to-image", "image-to-image"].includes(mode) && Boolean(config.apiBase && config.imageApiKey);
  }

  async submit(input: AinbGenerateInput, runtime?: ProviderRuntimeConfig) {
    const config = this.getConfig(runtime);
    if (!config.imageApiKey) throw new Error("Ainb image provider is not configured");
    if (input.mode === "image-to-image" && input.count > 1) {
      if (!input.inputImageUrl) throw new BadRequestException("图生图需要参考图");
      const reference = await this.downloadReferenceImage(input.inputImageUrl);
      const submitted = await Promise.allSettled(
        Array.from({ length: input.count }, () => this.submitEdit(config, { ...input, count: 1 }, reference))
      );
      const taskIds = submitted.flatMap((item) => item.status === "fulfilled" ? [this.extractTaskId(item.value)] : []);
      if (!taskIds.length) {
        const firstFailure = submitted.find((item): item is PromiseRejectedResult => item.status === "rejected");
        throw firstFailure?.reason instanceof Error ? firstFailure.reason : new Error("Ainb batch submission failed");
      }
      if (taskIds.length < input.count) this.logger.warn(`Ainb batch submitted ${taskIds.length} of ${input.count} task(s)`);
      return { taskId: this.encodeTaskIds(taskIds) };
    }
    const payload =
      input.mode === "image-to-image"
        ? await this.submitEdit(config, input)
        : await this.requestJson(config.endpoint || `${config.apiBase}/v1/images/generations?async=true`, {
            method: "POST",
            headers: this.jsonHeaders(config.imageApiKey),
            body: JSON.stringify({
              ...pickProviderParams(config.params, config.dynamicParams
                ? Object.keys(config.params)
                : ["quality", "output_format", "response_format", "moderation", "output_compression"]),
              model: IMAGE_2_MODEL_ID,
              prompt: input.prompt,
              size: normalizeImage2Size(input.ratio, input.quality),
              n: input.count
            })
          });
    return { taskId: this.extractTaskId(payload) };
  }

  async waitForOutputs(taskId: string, onInProgress?: (elapsedMs: number) => Promise<void> | void, runtime?: ProviderRuntimeConfig): Promise<Change2ProOutput[]> {
    const config = this.getConfig(runtime);
    if (!config.imageApiKey) throw new Error("Ainb image provider is not configured");
    const taskIds = this.decodeTaskIds(taskId);
    if (taskIds.length === 1) return this.waitForSingleOutput(config, taskIds[0], onInProgress);
    const settled = await Promise.allSettled(taskIds.map((id) => this.waitForSingleOutput(config, id, onInProgress)));
    const outputs = settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
    if (outputs.length) {
      const failedCount = settled.length - outputs.length;
      if (failedCount) this.logger.warn(`Ainb batch ${taskId} completed with ${failedCount} failed task(s)`);
      return outputs;
    }
    const firstFailure = settled.find((item): item is PromiseRejectedResult => item.status === "rejected");
    throw firstFailure?.reason instanceof Error ? firstFailure.reason : new Error("Ainb batch generation failed");
  }

  private async waitForSingleOutput(config: AinbConfig, taskId: string, onInProgress?: (elapsedMs: number) => Promise<void> | void) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < GENERATION_TIMEOUT_MS) {
      const payload = await this.requestJson(`${config.apiBase}/v1/images/tasks/${encodeURIComponent(taskId)}`, {
        headers: this.authHeaders(config.imageApiKey)
      });
      const data = asRecord(asRecord(payload)?.data);
      const status = this.stringValue(data?.status).toUpperCase();
      if (status === "SUCCESS") {
        if (!data) throw new Error("Ainb result payload is invalid");
        const outputs = this.extractOutputs(data);
        if (!outputs.length) throw new Error("Ainb result did not include an image URL");
        return outputs;
      }
      if (status === "FAILURE") {
        throw new Error(this.stringValue(data?.fail_reason) || "Ainb generation failed");
      }
      if (status && status !== "IN_PROGRESS") {
        this.logger.warn(`Ainb task ${taskId} returned unexpected status: ${status}`);
      }
      await onInProgress?.(Date.now() - startedAt);
      await this.delay(POLL_INTERVAL_MS);
    }
    throw new Error("Ainb generation timeout");
  }

  private extractOutputs(data: Record<string, unknown>) {
    const nested = asRecord(data.data);
    const candidates = Array.isArray(nested?.data) ? nested.data : [];
    const urls = candidates
      .map((item) => this.stringValue(asRecord(item)?.url))
      .filter(Boolean)
      .map((url) => ({ url }));
    return urls;
  }

  private async submitEdit(config: AinbConfig, input: AinbGenerateInput, suppliedReference?: ReferenceImage) {
    if (!input.inputImageUrl) throw new BadRequestException("图生图需要参考图");
    const reference = suppliedReference ?? await this.downloadReferenceImage(input.inputImageUrl);
    const form = new FormData();
    form.append("model", IMAGE_2_MODEL_ID);
    form.append("prompt", input.prompt);
    form.append("size", normalizeImage2Size(input.ratio, input.quality));
    form.append("n", String(input.count));
    Object.entries(pickProviderParams(config.params, config.dynamicParams
      ? Object.keys(config.params).filter((key) => !["model", "prompt", "size", "n", "image", "image[]"].includes(key))
      : ["quality", "input_fidelity", "output_format", "response_format", "moderation", "output_compression"]))
      .forEach(([key, value]) => form.append(key, String(value)));
    form.append("image[]", new Blob([reference.buffer], { type: reference.contentType }), `reference.${this.extension(reference.contentType)}`);
    return this.requestJson(config.endpoint || `${config.apiBase}/v1/images/edits?async=true`, {
      method: "POST",
      headers: this.authHeaders(config.imageApiKey),
      body: form
    });
  }

  private extractTaskId(payload: unknown) {
    const record = asRecord(payload);
    const data = asRecord(record?.data);
    const taskId = this.stringValue(record?.task_id) || this.stringValue(data?.task_id) || this.stringValue(data?.id);
    if (!taskId) throw new Error("Ainb response did not include task_id");
    return taskId;
  }

  private encodeTaskIds(taskIds: string[]) {
    if (taskIds.length === 1) return taskIds[0];
    return `${BATCH_TASK_PREFIX}${Buffer.from(JSON.stringify(taskIds), "utf8").toString("base64url")}`;
  }

  private decodeTaskIds(taskId: string) {
    if (!taskId.startsWith(BATCH_TASK_PREFIX)) return [taskId];
    try {
      const parsed = JSON.parse(Buffer.from(taskId.slice(BATCH_TASK_PREFIX.length), "base64url").toString("utf8"));
      if (!Array.isArray(parsed) || !parsed.length || parsed.some((item) => typeof item !== "string" || !item)) throw new Error();
      return parsed as string[];
    } catch {
      throw new Error("Ainb batch task id is invalid");
    }
  }

  private async requestJson(url: string, init: RequestInit) {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "network error";
      throw new Error(`Ainb request failed: ${message}`);
    }
    const payload = await response.json().catch(() => undefined);
    if (!response.ok || !payload) {
      const record = asRecord(payload);
      const message = this.stringValue(asRecord(record?.error)?.message) || this.stringValue(record?.message) || `HTTP ${response.status}`;
      throw new BadRequestException(`Ainb request failed: ${message}`);
    }
    return payload;
  }

  private authHeaders(apiKey: string) {
    return {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json"
    };
  }

  private jsonHeaders(apiKey: string) {
    return { ...this.authHeaders(apiKey), "Content-Type": "application/json; charset=utf-8" };
  }

  private getConfig(runtime?: ProviderRuntimeConfig) {
    if (runtime) {
      const configuredUrl = new URL(runtime.apiBase);
      const endpoint = configuredUrl.pathname === "/" && !configuredUrl.search ? undefined : runtime.apiBase;
      return {
        apiBase: configuredUrl.origin,
        endpoint,
        imageApiKey: runtime.apiKey,
        params: runtime.params,
        dynamicParams: Boolean(endpoint)
      };
    }
    const value = this.config.get<Omit<AinbConfig, "params">>("app.ainb");
    return {
      apiBase: (value?.apiBase || "https://ainb.plus").replace(/\/+$/, ""),
      imageApiKey: value?.imageApiKey || "",
      params: { quality: "high", response_format: "url", output_format: "png" },
      dynamicParams: false
    };
  }

  private stringValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
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

  private allowedReferenceHosts() {
    const oss = this.config.get<OssReferenceConfig>("app.oss");
    const hosts = new Set<string>();
    if (oss?.bucket && oss.endpoint) hosts.add(`${oss.bucket}.${oss.endpoint}`.toLowerCase());
    if (oss?.cdnBaseUrl) {
      try {
        hosts.add(new URL(oss.cdnBaseUrl).hostname.toLowerCase());
      } catch {
        // Invalid CDN configuration must not widen the allowlist.
      }
    }
    return hosts;
  }

  private extension(contentType: string) {
    if (contentType === "image/jpeg") return "jpg";
    if (contentType === "image/webp") return "webp";
    return "png";
  }
}
