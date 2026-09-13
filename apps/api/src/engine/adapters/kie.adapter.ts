import { firstNumberAtPath, firstStringAtPath, stringValuesAtPath } from "../../common/provider-response";
import type {
  AdapterContext,
  AdapterSubmitResult,
  NormalizedRequest,
  ProviderAdapter,
  ProviderEvent
} from "../engine.types";
import { asRecord, authHeaders, requestJson } from "./adapter-http";

type KieTaskRecord = {
  taskId?: string;
  state?: string;
  status?: string;
  resultJson?: string;
  failMsg?: string;
  errorMessage?: string;
  msg?: string;
  progress?: number;
};

/**
 * KIE 任务协议适配器（createTask + recordInfo + 回调）。
 * 异步、URL 结果；callbackUrl 由引擎注入。
 */
export class KieAdapter implements ProviderAdapter {
  readonly kind = "kie" as const;
  readonly requestMode = "async" as const;

  async submit(ctx: AdapterContext, req: NormalizedRequest): Promise<AdapterSubmitResult> {
    const config = ctx.config;
    const url = new URL(config.baseUrl);
    const createEndpoint = url.pathname === "/" && !url.search ? `${url.origin}/api/v1/jobs/createTask` : config.baseUrl;
    const body = this.buildCreateTaskBody(req, ctx.callbackUrl);
    const payload = await requestJson(createEndpoint, {
      method: "POST",
      headers: { ...authHeaders(ctx.apiKey, config), "Content-Type": "application/json", "X-Request-Id": req.attemptId },
      body: JSON.stringify(body)
    }, { billed: true, timeoutMs: 60_000, label: "kie createTask" });
    const mapping = config.responseMapping;
    const taskId = mapping.taskIdPath
      ? firstStringAtPath(payload, mapping.taskIdPath)
      : firstStringAtPath(payload, "data.taskId") || firstStringAtPath(payload, "data.task_id");
    if (!taskId) throw new Error("KIE 响应缺少 taskId");
    return { taskId };
  }

  async poll(ctx: AdapterContext, taskId: string): Promise<ProviderEvent> {
    const detail = await this.getTaskDetail(ctx, taskId);
    return this.normalizeEvent({ ...detail, taskId: detail.taskId || taskId });
  }

  parseCallback(payload: unknown): ProviderEvent {
    return this.normalizeEvent(payload);
  }

  private async getTaskDetail(ctx: AdapterContext, taskId: string): Promise<KieTaskRecord> {
    const config = ctx.config;
    const queryEndpoint = config.queryEndpoint;
    const url = queryEndpoint
      ? new URL(queryEndpoint.replaceAll("{task_id}", encodeURIComponent(taskId)).replaceAll("{taskId}", encodeURIComponent(taskId)))
      : new URL(`${new URL(config.baseUrl).origin}/api/v1/jobs/recordInfo`);
    if (!queryEndpoint) url.searchParams.set("taskId", taskId);
    const payload = await requestJson(url.toString(), {
      method: "GET",
      headers: authHeaders(ctx.apiKey, config)
    }, { billed: false, timeoutMs: 30_000, label: "kie recordInfo" });
    if (!config.responseMapping.statusPath) {
      const data = asRecord(payload.data) ?? {};
      return data as KieTaskRecord;
    }
    const mapping = config.responseMapping;
    const originalData = asRecord(payload.data) ?? {};
    const rawStatus = firstStringAtPath(payload, mapping.statusPath);
    const success = String(mapping.successValue || "completed").toLowerCase();
    const failure = String(mapping.failureValue || "failed").toLowerCase();
    const pending = String(mapping.pendingValue || "").toLowerCase();
    const normalized = rawStatus.toLowerCase() === success
      ? "completed"
      : rawStatus.toLowerCase() === failure
        ? "failed"
        : rawStatus.toLowerCase() === pending
          ? "running"
          : rawStatus;
    const imageUrls = stringValuesAtPath(payload, mapping.resultUrlPath || "");
    return {
      taskId: firstStringAtPath(payload, mapping.taskIdPath || "") || taskId,
      status: normalized,
      resultJson: imageUrls.length ? JSON.stringify({ resultUrls: imageUrls }) : String(originalData.resultJson ?? ""),
      failMsg: firstStringAtPath(payload, mapping.errorPath || "") || String(originalData.failMsg ?? ""),
      progress: config.statusEnabled ? firstNumberAtPath(payload, mapping.progressPath || "") : undefined
    };
  }

  private buildCreateTaskBody(req: NormalizedRequest, callbackUrl: string) {
    const { model: configuredModel, ...inputParams } = req.params;
    const model = configuredModel || this.resolveModel(req);
    const body: Record<string, unknown> = {
      model,
      input: { ...inputParams, ...this.buildInput(req, model) }
    };
    if (callbackUrl) body.callBackUrl = callbackUrl;
    return body;
  }

  private buildInput(req: NormalizedRequest, model: string) {
    const payload: Record<string, unknown> = {
      prompt: req.prompt,
      aspect_ratio: req.ratio,
      resolution: req.quality.match(/\b(1K|2K|4K)\b/i)?.[1]?.toUpperCase() ?? "1K"
    };
    if (req.count > 1) payload.output_quantity = req.count;
    if (req.inputImageUrls.length) {
      if (model === "gpt-image-2-image-to-image") payload.input_urls = req.inputImageUrls;
      else if (model === "seedream/4.5-edit") payload.image_urls = req.inputImageUrls;
      else payload.image_input = req.inputImageUrls;
    }
    return payload;
  }

  /** 兼容历史模型命名：基座名 + 操作方向合成 KIE 任务模型名。 */
  private resolveModel(req: NormalizedRequest) {
    const base = req.providerModel;
    if (base === "gpt-image-2") {
      return req.operation === "image-to-image" ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image";
    }
    if (base === "seedream-4-5" || base === "seedream/4.5") {
      return req.operation === "image-to-image" ? "seedream/4.5-edit" : "seedream/4.5-text-to-image";
    }
    return base;
  }

  private normalizeEvent(body: unknown): ProviderEvent {
    const data = asRecord((body as Record<string, unknown>)?.data) ?? asRecord(body) ?? {};
    const root = asRecord(body) ?? {};
    const result = this.parseJsonRecord(data.resultJson);
    const state = String(data.state ?? data.status ?? root.state ?? root.status ?? "");
    return {
      state: mapKieState(state),
      imageUrls: extractImageUrls(result),
      stageText: String(data.stageText ?? data.msg ?? root.msg ?? ""),
      errorMessage: String(data.failMsg ?? data.errorMessage ?? data.msg ?? root.msg ?? ""),
      progress: normalizeProgress(data.progress ?? root.progress)
    };
  }

  private parseJsonRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value) return undefined;
    const record = asRecord(value);
    if (record) return record;
    if (typeof value !== "string") return undefined;
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return undefined;
    }
  }
}

function normalizeProgress(value: unknown): number | undefined {
  const progress = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(progress)) return undefined;
  return Math.max(0, Math.min(100, progress));
}

export function extractImageUrls(result: Record<string, unknown> | undefined): string[] {
  if (!result) return [];
  const candidates = [result.resultUrls, result.result_urls, result.urls, result.images, result.imageUrls];
  const urls: string[] = [];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === "string") urls.push(item);
        else {
          const record = asRecord(item);
          const url = record ? record.url ?? record.imageUrl : undefined;
          if (typeof url === "string") urls.push(url);
        }
      }
    } else if (typeof candidate === "string") {
      urls.push(candidate);
    }
  }
  return [...new Set(urls.filter(Boolean))];
}

export function mapKieState(state: string): ProviderEvent["state"] {
  const normalized = state.toLowerCase();
  if (["success", "succeeded", "completed", "complete"].includes(normalized)) return "succeeded";
  if (["fail", "failed", "error", "failure"].includes(normalized)) return "failed";
  if (["generating", "running", "processing", "in_progress"].includes(normalized)) return "running";
  return "queued";
}
