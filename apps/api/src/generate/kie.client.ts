import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ModelConfig } from "@prisma/client";
import type { ProviderRuntimeConfig } from "./provider-runtime";

type KieConfig = {
  apiBase: string;
  apiKey: string;
  callbackUrl: string;
};

type SubmitGenerateJobInput = {
  jobId: string;
  mode: string;
  model: ModelConfig;
  prompt: string;
  inputImageUrl: string;
  ratio: string;
  quality: string;
  count: number;
};

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

@Injectable()
export class KieClient {
  constructor(private readonly config: ConfigService) {}

  isConfigured(runtime?: ProviderRuntimeConfig) {
    const kie = this.getConfig(runtime);
    return Boolean(kie?.apiBase && kie.apiKey);
  }

  async submitGenerateJob(input: SubmitGenerateJobInput, runtime?: ProviderRuntimeConfig) {
    const kie = this.getConfig(runtime);
    if (!kie.apiKey) throw new Error("KIE_API_KEY is not configured");

    const body = this.buildCreateTaskBody(input, kie.callbackUrl);
    const res = await fetch(`${kie.apiBase.replace(/\/$/, "")}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kie.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Request-Id": input.jobId
      },
      body: JSON.stringify(body)
    });

    const payload = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: { taskId?: string } } | null;
    if (!res.ok || !payload || (payload.code !== undefined && payload.code !== 200)) {
      throw new Error(payload?.msg || `KIE request failed with HTTP ${res.status}`);
    }

    const taskId = payload.data?.taskId;
    if (!taskId) throw new Error("KIE response missing taskId");
    return { taskId, requestBody: body };
  }

  async getTaskDetail(taskId: string, runtime?: ProviderRuntimeConfig) {
    const kie = this.getConfig(runtime);
    if (!kie.apiKey) throw new Error("KIE_API_KEY is not configured");

    const url = new URL(`${kie.apiBase.replace(/\/$/, "")}/api/v1/jobs/recordInfo`);
    url.searchParams.set("taskId", taskId);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${kie.apiKey}`,
        Accept: "application/json"
      }
    });

    const payload = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: KieTaskRecord } | null;
    if (!res.ok || !payload || (payload.code !== undefined && ![200, 500, 505].includes(payload.code))) {
      throw new Error(payload?.msg || `KIE recordInfo failed with HTTP ${res.status}`);
    }
    if (!payload.data) throw new Error("KIE recordInfo response missing data");
    return payload.data;
  }

  private buildCreateTaskBody(input: SubmitGenerateJobInput, callbackUrl: string) {
    const model = this.resolveKieModel(input);
    const body: Record<string, unknown> = {
      model,
      input: this.buildInput(input, model)
    };

    const securedCallbackUrl = this.buildCallbackUrl(callbackUrl);
    if (securedCallbackUrl) body.callBackUrl = securedCallbackUrl;
    return body;
  }

  private buildInput(input: SubmitGenerateJobInput, model: string) {
    const imageUrls = input.inputImageUrl ? [input.inputImageUrl] : [];
    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      aspect_ratio: input.ratio,
      resolution: this.normalizeResolution(input.quality)
    };

    if (input.count > 1) payload.output_quantity = input.count;

    if (imageUrls.length) {
      if (model === "gpt-image-2-image-to-image") payload.input_urls = imageUrls;
      else if (model === "seedream/4.5-edit") payload.image_urls = imageUrls;
      else payload.image_input = imageUrls;
    }

    return payload;
  }

  private resolveKieModel(input: SubmitGenerateJobInput) {
    if (input.model.id === "gpt-image-2") {
      return input.mode === "image-to-image" ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image";
    }
    if (input.model.id === "seedream-4-5") {
      return input.mode === "image-to-image" ? "seedream/4.5-edit" : "seedream/4.5-text-to-image";
    }
    return input.model.providerModel;
  }

  private normalizeResolution(quality: string) {
    return quality.match(/\b(1K|2K|4K)\b/i)?.[1]?.toUpperCase() ?? "1K";
  }

  private buildCallbackUrl(callbackUrl: string) {
    if (!callbackUrl) return "";
    const secret = this.config.get<string>("app.callbackSecret");
    if (!secret) return callbackUrl;
    const url = new URL(callbackUrl);
    url.searchParams.set("secret", secret);
    return url.toString();
  }

  private getConfig(runtime?: ProviderRuntimeConfig): KieConfig {
    const configured = this.config.get<KieConfig>("app.kie");
    if (runtime) {
      return {
        apiBase: runtime.apiBase.replace(/\/+$/, ""),
        apiKey: runtime.apiKey,
        callbackUrl: configured?.callbackUrl || ""
      };
    }
    return configured ?? { apiBase: "https://api.kie.ai", apiKey: "", callbackUrl: "" };
  }
}
