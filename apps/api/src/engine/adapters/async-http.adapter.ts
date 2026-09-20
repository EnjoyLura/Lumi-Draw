import { firstNumberAtPath, firstStringAtPath, stringValuesAtPath } from "../../common/provider-response";
import { buildProviderSizeParams, sizeParamKeys, requestJson, authHeaders, authenticatedUrl, downloadReferenceImage, extensionFor, renderTemplate, asRecord } from "./adapter-http";
import type {
  AdapterContext,
  AdapterOutput,
  AdapterSubmitResult,
  NormalizedRequest,
  ProviderAdapter,
  ProviderConfig,
  ProviderEvent
} from "../engine.types";

const BATCH_TASK_PREFIX = "batch:";
const SYNC_SUBMIT_TIMEOUT_MS = 30 * 60_000;

type Mapping = {
  taskIdPath: string;
  statusPath: string;
  progressPath: string;
  resultUrlPath: string;
  errorPath: string;
  successValue: string;
  failureValue: string;
};

/**
 * 通用异步/同步 HTTP 适配器：请求模板 + 响应映射全部来自平台配置。
 * 接入新的"提交+轮询"型平台应当只改配置，不写代码。
 */
export class AsyncHttpAdapter implements ProviderAdapter {
  readonly kind = "async-http" as const;
  readonly requestMode: "sync" | "async";

  constructor(requestMode: "sync" | "async") {
    this.requestMode = requestMode;
  }

  async submit(ctx: AdapterContext, req: NormalizedRequest): Promise<AdapterSubmitResult> {
    const config = ctx.config;
    const mapping = normalizeMapping(config.responseMapping);
    const endpoint = (req.operation === "image-to-image" ? config.imageEndpoint : config.baseUrl) || config.baseUrl;
    if (!endpoint) throw new Error("平台未配置请求端点");

    if (req.operation === "image-to-image" && config.imageInputMode === "multipart") {
      // multipart 编辑接口：多图输出靠并行提交多个单图任务。
      if (!req.inputImageUrls.length) throw new Error("图生图需要参考图");
      if (req.count > 1 && req.inputImageUrls.length === 1) {
        const reference = await downloadReferenceImage(req.inputImageUrls[0], ctx.allowedReferenceHosts);
        const settled = await Promise.allSettled(
          Array.from({ length: req.count }, () => this.submitMultipart(ctx, req, endpoint, [reference], 1))
        );
        const taskIds = settled.flatMap((item) => (item.status === "fulfilled" ? [item.value] : []));
        if (!taskIds.length) {
          const failure = settled.find((item): item is PromiseRejectedResult => item.status === "rejected");
          throw failure?.reason instanceof Error ? failure.reason : new Error("批量提交失败");
        }
        return { taskId: encodeTaskIds(taskIds) };
      }
      const references = await Promise.all(req.inputImageUrls.map((url) => downloadReferenceImage(url, ctx.allowedReferenceHosts)));
      return { taskId: await this.submitMultipart(ctx, req, endpoint, references, req.count) };
    }

    const payload = this.buildJsonPayload(ctx, req);
    const response = await requestJson(authenticatedUrl(endpoint, ctx.apiKey, config), {
      method: "POST",
      headers: { ...authHeaders(ctx.apiKey, config, { "Content-Type": "application/json; charset=utf-8" }), "X-Request-Id": req.attemptId },
      body: JSON.stringify(payload)
    }, { billed: true, timeoutMs: this.requestMode === "sync" ? SYNC_SUBMIT_TIMEOUT_MS : 60_000, label: "async-http submit" });

    if (this.requestMode === "sync") {
      const outputs = stringValuesAtPath(response, mapping.resultUrlPath).map((url) => ({ url }) as AdapterOutput);
      if (!outputs.length) throw new Error("上游响应没有包含图片 URL");
      return { outputs: outputs.slice(0, req.count) };
    }
    const taskId = mappedTaskId(response, mapping);
    if (!taskId) throw new Error("上游响应缺少 task_id");
    return { taskId };
  }

  async poll(ctx: AdapterContext, taskId: string): Promise<ProviderEvent> {
    const config = ctx.config;
    const mapping = normalizeMapping(config.responseMapping);
    const taskIds = decodeTaskIds(taskId);
    const settled = await Promise.allSettled(taskIds.map((id) => this.pollSingle(ctx, id, mapping)));
    const outputs: string[] = [];
    let failureMessage = "";
    let pending = false;
    for (const item of settled) {
      if (item.status === "fulfilled") {
        if (item.value.imageUrls.length) outputs.push(...item.value.imageUrls);
        else if (item.value.state === "failed" && item.value.errorMessage) failureMessage = item.value.errorMessage;
        else pending = true;
      } else if (!failureMessage) {
        failureMessage = item.reason instanceof Error ? item.reason.message : String(item.reason);
      }
    }
    if (outputs.length) return { state: "succeeded", imageUrls: outputs, stageText: "", errorMessage: "" };
    if (failureMessage && !pending) return { state: "failed", imageUrls: [], stageText: "", errorMessage: failureMessage };
    return { state: "running", imageUrls: [], stageText: "", errorMessage: "" };
  }

  /** 上游主动回调与轮询共用同一份响应映射。 */
  parseCallback(payload: unknown, config: ProviderConfig): ProviderEvent {
    return this.toEvent(payload, config, normalizeMapping(config.responseMapping));
  }

  /** 单次状态查询，绝不内部循环——轮询节奏由引擎 watchdog 统一调度。 */
  private async pollSingle(ctx: AdapterContext, taskId: string, mapping: Mapping): Promise<ProviderEvent> {
    const config = ctx.config;
    if (!config.queryEndpoint) throw new Error("平台未配置查询端点");
    const payload = await requestJson(authenticatedUrl(queryUrl(config.queryEndpoint, taskId), ctx.apiKey, config), {
      method: "GET",
      headers: authHeaders(ctx.apiKey, { ...config, requestHeaders: config.queryHeaders })
    }, { billed: false, timeoutMs: 60_000, label: "async-http poll" });
    return this.toEvent(payload, config, mapping);
  }

  private toEvent(payload: unknown, config: ProviderConfig, mapping: Mapping): ProviderEvent {
    const status = firstStringAtPath(payload, mapping.statusPath).toUpperCase();
    const progress = config.statusEnabled ? normalizeProgress(firstNumberAtPath(payload, mapping.progressPath)) : undefined;
    if (status === mapping.successValue.toUpperCase()) {
      const imageUrls = stringValuesAtPath(payload, mapping.resultUrlPath);
      if (!imageUrls.length) throw new Error("上游任务成功但没有返回图片");
      return { state: "succeeded", imageUrls, stageText: "", errorMessage: "", progress: 100 };
    }
    if (status === mapping.failureValue.toUpperCase()) {
      return { state: "failed", imageUrls: [], stageText: "", errorMessage: firstStringAtPath(payload, mapping.errorPath) || "上游任务失败" };
    }
    return { state: "running", imageUrls: [], stageText: "", errorMessage: "", progress };
  }

  private buildJsonPayload(ctx: AdapterContext, req: NormalizedRequest): Record<string, unknown> {
    const config = ctx.config;
    const template = req.operation === "image-to-image" && Object.keys(config.imageRequestTemplate).length
      ? config.imageRequestTemplate
      : config.requestTemplate;
    const sizeParams = buildProviderSizeParams(req.ratio, req.quality, req.pixelSize, config);
    const tokens: Record<string, unknown> = {
      model: req.providerModel,
      prompt: req.prompt,
      count: req.count,
      n: req.count,
      ratio: req.ratio,
      resolution: sizeParams[config.resolutionField] || "",
      size: sizeParams[config.pixelSizeField] || req.ratio,
      image_url: req.inputImageUrls[0] || "",
      image_urls: req.inputImageUrls,
      callback_url: ctx.callbackUrl,
      attempt_id: req.attemptId
    };
    const hasTemplate = Object.keys(template).length > 0;
    const source = hasTemplate ? template : req.params;
    const payload = renderTemplate(source, tokens) as Record<string, unknown>;
    if (!("prompt" in payload)) payload.prompt = req.prompt;
    if (config.injectModel || !("model" in payload)) payload.model = req.providerModel;
    if (config.injectCount || !("n" in payload)) payload.n = req.count;
    for (const [key, value] of Object.entries(sizeParams)) {
      if (!hasTemplate || !(key in payload)) payload[key] = value;
    }
    if (req.operation === "image-to-image") {
      if (!req.inputImageUrls.length) throw new Error("图生图需要参考图");
      if (config.imageInputMode === "url-array") payload[config.imageInputField || "image_urls"] = req.inputImageUrls;
      if (config.imageInputMode === "url") payload[config.imageInputField || "image"] = req.inputImageUrls[0];
    }
    return payload;
  }

  private async submitMultipart(ctx: AdapterContext, req: NormalizedRequest, endpoint: string, references: Array<{ buffer: Buffer; contentType: string }>, count: number): Promise<string> {
    const config = ctx.config;
    const sizeParams = buildProviderSizeParams(req.ratio, req.quality, req.pixelSize, config);
    const excluded = ["model", "prompt", "n", "image", "image[]", "image_urls", "reference_images", config.imageInputField, ...sizeParamKeys(config)];
    const extra = Object.fromEntries(Object.keys(req.params).filter((key) => !excluded.includes(key)).map((key) => [key, req.params[key]]));
    const form = new FormData();
    form.append("model", req.providerModel);
    form.append("prompt", req.prompt);
    form.append("n", String(count));
    Object.entries(sizeParams).forEach(([key, value]) => form.append(key, value));
    Object.entries(extra).forEach(([key, value]) => form.append(key, String(value)));
    references.forEach((reference, index) => {
      form.append(
        config.imageInputField || "image[]",
        new Blob([reference.buffer], { type: reference.contentType }),
        `reference-${index + 1}.${extensionFor(reference.contentType)}`
      );
    });
    const response = await requestJson(endpoint, {
      method: "POST",
      headers: authHeaders(ctx.apiKey, config),
      body: form
    }, { billed: true, timeoutMs: 60_000, label: "async-http multipart submit" });
    const taskId = mappedTaskId(response, normalizeMapping(config.responseMapping));
    if (!taskId) throw new Error("上游响应缺少 task_id");
    return taskId;
  }
}

export function normalizeMapping(value: Record<string, string>): Mapping {
  return {
    taskIdPath: value.taskIdPath || "task_id",
    statusPath: value.statusPath || "data.status",
    progressPath: value.progressPath || "data.progress",
    resultUrlPath: value.resultUrlPath || "data.data.data[].url",
    errorPath: value.errorPath || "data.fail_reason",
    successValue: value.successValue || "SUCCESS",
    failureValue: value.failureValue || "FAILURE"
  };
}

function normalizeProgress(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mappedTaskId(payload: unknown, mapping: Mapping): string {
  if (mapping.taskIdPath) {
    const configured = firstStringAtPath(payload, mapping.taskIdPath);
    if (configured) return configured;
  }
  const record = asRecord(payload);
  const data = asRecord(record?.data);
  const candidates = [record?.task_id, record?.id, data?.task_id, data?.id];
  const found = candidates.find((item) => typeof item === "string" && item.trim());
  return typeof found === "string" ? found.trim() : "";
}

export function encodeTaskIds(taskIds: string[]): string {
  if (taskIds.length === 1) return taskIds[0];
  return `${BATCH_TASK_PREFIX}${Buffer.from(JSON.stringify(taskIds), "utf8").toString("base64url")}`;
}

export function decodeTaskIds(taskId: string): string[] {
  if (!taskId.startsWith(BATCH_TASK_PREFIX)) return [taskId];
  try {
    const parsed = JSON.parse(Buffer.from(taskId.slice(BATCH_TASK_PREFIX.length), "base64url").toString("utf8"));
    if (!Array.isArray(parsed) || !parsed.length || parsed.some((item) => typeof item !== "string" || !item)) throw new Error();
    return parsed as string[];
  } catch {
    throw new Error("批量任务 ID 无效");
  }
}

function queryUrl(template: string, taskId: string): string {
  const encoded = encodeURIComponent(taskId);
  return template.replaceAll("{task_id}", encoded).replaceAll("{taskId}", encoded);
}
