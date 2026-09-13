import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { normalizeImage2Size, type Change2ProOutput } from "./change2pro.client";
import { normalizeProviderJsonObject, pickProviderParams, type ProviderAuthMode, type ProviderRuntimeConfig } from "./provider-runtime";
import { firstNumberAtPath, firstStringAtPath, stringValuesAtPath } from "../common/provider-response";
import { buildProviderSizeParams, normalizeProviderSizeConfig, type ProviderSizeConfig } from "../common/provider-size";

type AinbConfig = {
  adapter: "ainb" | "generic";
  apiBase: string;
  endpoint?: string;
  imageApiKey: string;
  params: Record<string, string>;
  dynamicParams: boolean;
  requestMode: "sync" | "async";
  queryEndpoint: string;
  statusEnabled: boolean;
  responseMapping: Record<string, string>;
  sizeConfig: ProviderSizeConfig;
  imageInputMode: "multipart" | "url" | "url-array";
  imageInputField: string;
  authMode: ProviderAuthMode;
  authHeaderName: string;
  authQueryName: string;
  requestHeaders: Record<string, string>;
  queryHeaders: Record<string, string>;
  requestTemplate: Record<string, unknown>;
  injectModel: boolean;
  injectCount: boolean;
};

type AinbGenerateInput = {
  mode: string;
  providerModel?: string;
  prompt: string;
  inputImageUrl: string;
  inputImageUrls?: string[];
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

  isConfiguredFor(_modelId: string, mode: string) {
    const config = this.getConfig();
    return ["text-to-image", "image-to-image"].includes(mode) && Boolean(config.apiBase && config.imageApiKey);
  }

  async submit(input: AinbGenerateInput, runtime?: ProviderRuntimeConfig) {
    const config = this.getConfig(runtime);
    const imageUrls = input.inputImageUrls?.length ? input.inputImageUrls : (input.inputImageUrl ? [input.inputImageUrl] : []);
    if (config.adapter === "generic") return this.submitGeneric(input, config);
    const providerModel = input.providerModel || ("model" in config.params ? String(config.params.model) : "") || IMAGE_2_MODEL_ID;
    const sizeParams = buildProviderSizeParams(
      input.ratio,
      input.quality,
      normalizeImage2Size(input.ratio, input.quality),
      config.sizeConfig
    );
    if (!config.imageApiKey && config.authMode !== "none") throw new Error("Ainb image provider is not configured");
    if (input.mode === "image-to-image" && config.imageInputMode === "multipart" && input.count > 1 && imageUrls.length === 1) {
      if (!imageUrls.length) throw new BadRequestException("图生图需要参考图");
      const reference = await this.downloadReferenceImage(imageUrls[0]);
      const submitted = await Promise.allSettled(
        Array.from({ length: input.count }, () => this.submitEdit(config, { ...input, count: 1 }, reference))
      );
      const taskIds = submitted.flatMap((item) => item.status === "fulfilled" ? [this.extractTaskId(item.value, config.responseMapping)] : []);
      if (!taskIds.length) {
        const firstFailure = submitted.find((item): item is PromiseRejectedResult => item.status === "rejected");
        throw firstFailure?.reason instanceof Error ? firstFailure.reason : new Error("Ainb batch submission failed");
      }
      if (taskIds.length < input.count) this.logger.warn(`Ainb batch submitted ${taskIds.length} of ${input.count} task(s)`);
      return { taskId: this.encodeTaskIds(taskIds) };
    }
    const payload =
      input.mode === "image-to-image"
        ? await this.submitEdit(config, { ...input, inputImageUrls: imageUrls, inputImageUrl: imageUrls[0] || "" }, undefined, providerModel)
        : await this.requestJson(config.endpoint || `${config.apiBase}/v1/images/generations?async=true`, {
            method: "POST",
            headers: this.jsonHeaders(config),
            body: JSON.stringify({
              ...pickProviderParams(config.params, config.dynamicParams
                ? Object.keys(config.params).filter((key) => !this.sizeParamKeys(config.sizeConfig).includes(key))
                : ["quality", "output_format", "response_format", "moderation", "output_compression"]),
              model: providerModel,
              prompt: input.prompt,
              n: input.count,
              ...sizeParams
            })
          });
    return { taskId: this.extractTaskId(payload, config.responseMapping) };
  }

  async waitForOutputs(taskId: string, onInProgress?: (elapsedMs: number, providerProgress?: number) => Promise<void> | void, runtime?: ProviderRuntimeConfig): Promise<Change2ProOutput[]> {
    const config = this.getConfig(runtime);
    if (!config.imageApiKey && config.authMode !== "none") throw new Error("Ainb image provider is not configured");
    if (config.adapter === "generic" && taskId.startsWith("generic-sync:")) {
      return this.genericOutputs(this.decodeGenericSyncPayload(taskId), config.responseMapping);
    }
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

  private async waitForSingleOutput(config: AinbConfig, taskId: string, onInProgress?: (elapsedMs: number, providerProgress?: number) => Promise<void> | void) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < GENERATION_TIMEOUT_MS) {
      const payload = await this.requestJson(this.authenticatedUrl(this.queryUrl(config.queryEndpoint, taskId), config), {
        headers: this.authHeaders(config, "query")
      });
      const status = firstStringAtPath(payload, config.responseMapping.statusPath).toUpperCase();
      if (status === config.responseMapping.successValue.toUpperCase()) {
        const outputs = stringValuesAtPath(payload, config.responseMapping.resultUrlPath).map((url) => ({ url }));
        if (!outputs.length) throw new Error("Ainb result did not include an image URL");
        return outputs;
      }
      if (status === config.responseMapping.failureValue.toUpperCase()) {
        throw new Error(firstStringAtPath(payload, config.responseMapping.errorPath) || "Ainb generation failed");
      }
      if (status && !this.statusValues(config.responseMapping.pendingValue).includes(status)) {
        this.logger.warn(`Ainb task ${taskId} returned unexpected status: ${status}`);
      }
      const providerProgress = config.statusEnabled
        ? firstNumberAtPath(payload, config.responseMapping.progressPath)
        : undefined;
      await onInProgress?.(Date.now() - startedAt, providerProgress);
      await this.delay(POLL_INTERVAL_MS);
    }
    throw new Error("Ainb generation timeout");
  }

  private async submitEdit(config: AinbConfig, input: AinbGenerateInput, suppliedReference?: ReferenceImage, providerModel?: string) {
    const imageUrls = input.inputImageUrls?.length ? input.inputImageUrls : (input.inputImageUrl ? [input.inputImageUrl] : []);
    if (!imageUrls.length) throw new BadRequestException("图生图需要参考图");
    const configuredModel = "model" in config.params ? String(config.params.model) : "";
    const resolvedModel = providerModel || input.providerModel || configuredModel || IMAGE_2_MODEL_ID;
    const sizeParams = buildProviderSizeParams(
      input.ratio,
      input.quality,
      normalizeImage2Size(input.ratio, input.quality),
      config.sizeConfig
    );
    const excludedFields = [
      "model", "prompt", "n", "image", "image[]", "image_urls", "reference_images",
      config.imageInputField,
      ...this.sizeParamKeys(config.sizeConfig)
    ];
    const dynamicParams = pickProviderParams(config.params, config.dynamicParams
      ? Object.keys(config.params).filter((key) => !excludedFields.includes(key))
      : ["quality", "input_fidelity", "output_format", "response_format", "moderation", "output_compression"]);
    const endpoint = config.endpoint || `${config.apiBase}/v1/images/edits?async=true`;
    if (config.imageInputMode === "url-array") {
      return this.requestJson(endpoint, {
        method: "POST",
        headers: this.jsonHeaders(config),
        body: JSON.stringify({
          ...dynamicParams,
          model: resolvedModel,
          prompt: input.prompt,
          n: input.count,
          ...sizeParams,
          [config.imageInputField || "image_urls"]: imageUrls
        })
      });
    }

    const references = suppliedReference ? [suppliedReference] : await Promise.all(imageUrls.map((url) => this.downloadReferenceImage(url)));
    const form = new FormData();
    form.append("model", resolvedModel);
    form.append("prompt", input.prompt);
    form.append("n", String(input.count));
    Object.entries(sizeParams).forEach(([key, value]) => form.append(key, value));
    Object.entries(dynamicParams)
      .forEach(([key, value]) => form.append(key, String(value)));
    for (const reference of references) form.append(config.imageInputField || "image[]", new Blob([reference.buffer], { type: reference.contentType }), `reference.${this.extension(reference.contentType)}`);
    return this.requestJson(endpoint, {
      method: "POST",
      headers: this.authHeaders(config),
      body: form
    });
  }

  private async submitGeneric(input: AinbGenerateInput, config: AinbConfig) {
    const providerModel = input.providerModel || String(config.params.model || "") || IMAGE_2_MODEL_ID;
    const payload = this.genericPayload(config, input, providerModel);
    const endpoint = this.authenticatedUrl(config.endpoint || config.apiBase, config);
    const response = await this.requestJson(endpoint, {
      method: "POST",
      headers: this.jsonHeaders(config),
      body: JSON.stringify(payload)
    });
    if (config.requestMode === "sync") {
      return { taskId: this.encodeGenericSyncPayload(response) };
    }
    return { taskId: this.extractTaskId(response, config.responseMapping) };
  }

  private genericPayload(config: AinbConfig, input: AinbGenerateInput, providerModel: string) {
    const imageUrls = input.inputImageUrls?.length ? input.inputImageUrls : (input.inputImageUrl ? [input.inputImageUrl] : []);
    const sizeParams = buildProviderSizeParams(
      input.ratio,
      input.quality,
      normalizeImage2Size(input.ratio, input.quality),
      config.sizeConfig
    );
    const tokens: Record<string, unknown> = {
      model: providerModel,
      prompt: input.prompt,
      count: input.count,
      n: input.count,
      ratio: input.ratio,
      resolution: sizeParams[config.sizeConfig.resolutionField] || "",
      size: sizeParams[config.sizeConfig.pixelSizeField] || input.ratio,
      image_url: imageUrls[0] || "",
      image_urls: imageUrls
    };
    const hasTemplate = Object.keys(config.requestTemplate).length > 0;
    const payload = hasTemplate
      ? this.renderTemplate(config.requestTemplate, tokens) as Record<string, unknown>
      : this.renderTemplate(config.params, tokens) as Record<string, unknown>;
    if (!("prompt" in payload)) payload.prompt = input.prompt;
    if (config.injectModel) payload.model = providerModel;
    if (config.injectCount) payload.n = input.count;
    for (const [key, value] of Object.entries(sizeParams)) if (!hasTemplate || !(key in payload)) payload[key] = value;
    if (input.mode === "image-to-image") {
      if (!imageUrls.length) throw new BadRequestException("图生图需要参考图");
      if (config.imageInputMode === "url-array") payload[config.imageInputField || "image_urls"] = imageUrls;
      if (config.imageInputMode === "url") payload[config.imageInputField || "image"] = imageUrls[0];
      if (config.imageInputMode === "multipart") {
        throw new BadRequestException("通用 HTTP 适配器当前请使用 URL 或 URL 数组传递参考图");
      }
    }
    return payload;
  }

  private renderTemplate(input: unknown, tokens: Record<string, unknown>): unknown {
    if (typeof input === "string") {
      const exact = input.match(/^\{\{([a-z_]+)\}\}$/i)?.[1];
      if (exact && exact in tokens) return tokens[exact];
      return input.replace(/\{\{([a-z_]+)\}\}/gi, (_all, key) => {
        const value = tokens[String(key).toLowerCase()];
        return value === undefined || value === null ? "" : Array.isArray(value) ? JSON.stringify(value) : String(value);
      });
    }
    if (Array.isArray(input)) return input.map((item) => this.renderTemplate(item, tokens));
    if (input && typeof input === "object") {
      return Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, this.renderTemplate(value, tokens)]));
    }
    return input;
  }

  private authenticatedUrl(url: string, config: AinbConfig) {
    if (config.authMode !== "query") return url;
    const next = new URL(url);
    next.searchParams.set(config.authQueryName || "api_key", config.imageApiKey);
    return next.toString();
  }

  private encodeGenericSyncPayload(payload: unknown) {
    return `generic-sync:${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
  }

  private decodeGenericSyncPayload(taskId: string) {
    try {
      return JSON.parse(Buffer.from(taskId.slice("generic-sync:".length), "base64url").toString("utf8")) as unknown;
    } catch {
      throw new Error("Generic sync response cache is invalid");
    }
  }

  private genericOutputs(payload: unknown, mapping: Record<string, string>): Change2ProOutput[] {
    const outputs = stringValuesAtPath(payload, mapping.resultUrlPath || "").map((url) => ({ url }));
    if (!outputs.length) throw new Error("Generic response did not include an image URL");
    return outputs;
  }

  private replaceTextTokens(value: string, tokens: Record<string, string>) {
    return value.replace(/\{\{([a-z_]+)\}\}/gi, (_all, key) => tokens[String(key).toLowerCase()] ?? "");
  }

  private extractTaskId(payload: unknown, mapping?: Record<string, string>) {
    if (mapping?.taskIdPath) {
      const configuredTaskId = firstStringAtPath(payload, mapping.taskIdPath);
      if (configuredTaskId) return configuredTaskId;
    }
    const record = asRecord(payload);
    const data = asRecord(record?.data);
    const taskId = this.stringValue(record?.task_id)
      || this.stringValue(record?.id)
      || this.stringValue(data?.task_id)
      || this.stringValue(data?.id);
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

  private authHeaders(config: AinbConfig, purpose: "request" | "query" = "request") {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(purpose === "query" ? config.queryHeaders : config.requestHeaders)
    };
    if (config.authMode === "bearer") headers[config.authHeaderName || "Authorization"] = `Bearer ${config.imageApiKey}`;
    if (config.authMode === "raw") headers[config.authHeaderName || "Authorization"] = config.imageApiKey;
    return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, this.replaceTextTokens(value, { api_key: config.imageApiKey })]));
  }

  private jsonHeaders(config: AinbConfig, purpose: "request" | "query" = "request") {
    return { ...this.authHeaders(config, purpose), "Content-Type": "application/json; charset=utf-8" };
  }

  private getConfig(runtime?: ProviderRuntimeConfig): AinbConfig {
    if (runtime) {
      const configuredUrl = new URL(runtime.apiBase);
      const endpoint = configuredUrl.pathname === "/" && !configuredUrl.search ? undefined : runtime.apiBase;
      return {
        adapter: runtime.adapter === "generic" ? "generic" : "ainb",
        apiBase: configuredUrl.origin,
        endpoint,
        imageApiKey: runtime.apiKey,
        params: runtime.params,
        dynamicParams: Boolean(endpoint),
        requestMode: runtime.requestMode === "sync" ? "sync" : "async",
        queryEndpoint: runtime.queryEndpoint || `${configuredUrl.origin}/v1/images/tasks/{task_id}`,
        statusEnabled: Boolean(runtime.statusEnabled),
        responseMapping: this.responseMapping(runtime.responseMapping),
        sizeConfig: normalizeProviderSizeConfig(runtime.sizeConfig),
        imageInputMode: runtime.imageInputMode === "url-array" ? "url-array" : runtime.imageInputMode === "url" ? "url" : "multipart",
        imageInputField: runtime.imageInputField || (runtime.imageInputMode === "url-array" ? "image_urls" : "image[]"),
        authMode: runtime.authMode || "bearer",
        authHeaderName: runtime.authHeaderName || "Authorization",
        authQueryName: runtime.authQueryName || "api_key",
        requestHeaders: runtime.requestHeaders || {},
        queryHeaders: runtime.queryHeaders || {},
        requestTemplate: normalizeProviderJsonObject(runtime.requestTemplate),
        injectModel: runtime.injectModel !== false,
        injectCount: runtime.injectCount !== false
      };
    }
    const value = this.config.get<Omit<AinbConfig, "params">>("app.ainb");
    return {
      adapter: "ainb",
      apiBase: (value?.apiBase || "https://ainb.plus").replace(/\/+$/, ""),
      imageApiKey: value?.imageApiKey || "",
      params: { quality: "high", response_format: "url", output_format: "png" },
      dynamicParams: false,
      requestMode: "async",
      queryEndpoint: `${(value?.apiBase || "https://ainb.plus").replace(/\/+$/, "")}/v1/images/tasks/{task_id}`,
      statusEnabled: false,
      responseMapping: this.responseMapping(),
      sizeConfig: normalizeProviderSizeConfig(),
      imageInputMode: "multipart" as const,
      imageInputField: "image[]",
      authMode: "bearer",
      authHeaderName: "Authorization",
      authQueryName: "api_key",
      requestHeaders: {},
      queryHeaders: {},
      requestTemplate: {},
      injectModel: true,
      injectCount: true
    };
  }

  private sizeParamKeys(config: ProviderSizeConfig) {
    return [...new Set([config.pixelSizeField, config.ratioField, config.resolutionField])];
  }

  private responseMapping(value: Record<string, string> = {}) {
    return {
      taskIdPath: value.taskIdPath || "task_id",
      statusPath: value.statusPath || "data.status",
      progressPath: value.progressPath || "data.progress",
      resultUrlPath: value.resultUrlPath || "data.data.data[].url",
      errorPath: value.errorPath || "data.fail_reason",
      successValue: value.successValue || "SUCCESS",
      failureValue: value.failureValue || "FAILURE",
      pendingValue: value.pendingValue || "IN_PROGRESS"
    };
  }

  private statusValues(value: string) {
    return value.split(/[,\s|]+/).map((item) => item.trim().toUpperCase()).filter(Boolean);
  }

  private queryUrl(template: string, taskId: string) {
    const encoded = encodeURIComponent(taskId);
    return template.replaceAll("{task_id}", encoded).replaceAll("{taskId}", encoded);
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
