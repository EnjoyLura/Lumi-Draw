import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac } from "node:crypto";
import { timingSafeEqualStrings } from "../common/timing-safe";
import type { ProviderSizeConfig } from "../common/provider-size";
import type { ProviderResultUrlRewriteRule } from "../common/provider-result-url";

type ImageTransferConfig = {
  functionUrl: string;
  bearerToken: string;
  asyncInvocation: boolean;
};

export type ImageTransferRequest = {
  operation?: "transfer";
  invocationKey?: string;
  jobId: string;
  resultId: string;
  sourceUrl: string;
  fallbackSourceUrl?: string;
  objectKey: string;
};

export type ImageGenerationRequest = {
  operation: "generate";
  invocationKey?: string;
  jobId: string;
  provider: {
    protocol: "openai-images" | "gemini";
    endpoint: string;
    apiKey: string;
    model: string;
    params: Record<string, string>;
    requestMode?: "sync" | "async";
    queryEndpoint?: string;
    responseMapping?: Record<string, string>;
    sizeConfig?: ProviderSizeConfig;
    imageInputMode?: "multipart" | "url" | "url-array";
    imageInputField?: string;
    resultUrlRewriteRules?: ProviderResultUrlRewriteRule[];
  };
  input: {
    mode: string;
    prompt: string;
    inputImageUrl: string;
    inputImageUrls?: string[];
    ratio: string;
    quality: string;
    size: string;
    count: number;
  };
  objectKeys: string[];
};

@Injectable()
export class ImageTransferClient {
  private readonly logger = new Logger(ImageTransferClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    const config = this.getConfig();
    return Boolean(config.functionUrl && config.bearerToken);
  }

  dispatch(input: ImageTransferRequest) {
    const { invocationKey, ...payload } = input;
    return this.dispatchRequest(
      { ...payload, operation: "transfer" },
      this.taskId("transfer", invocationKey || input.resultId)
    );
  }

  dispatchGeneration(input: ImageGenerationRequest) {
    return this.retryDispatch(`generation ${input.jobId}`, () => this.dispatchGenerationOnce(input));
  }

  private dispatchGenerationOnce(input: ImageGenerationRequest) {
    const { invocationKey, ...payload } = input;
    return this.dispatchRequest(payload, this.taskId("generate", invocationKey || input.jobId));
  }

  private taskId(prefix: string, value: string) {
    return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 40)}`;
  }

  private dispatchRequest(input: ImageTransferRequest | ImageGenerationRequest, taskId: string) {
    const config = this.getConfig();
    if (!config.functionUrl || !config.bearerToken) throw new Error("Image transfer function is not configured");
    const body = JSON.stringify(input);
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", config.bearerToken).update(`${timestamp}.${body}`).digest("hex");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.bearerToken}`,
      "Content-Type": "application/json",
      "X-Lumi-Timestamp": timestamp,
      "X-Lumi-Signature": signature
    };
    if (config.asyncInvocation) {
      headers["X-Fc-Invocation-Type"] = "Async";
      headers["X-Fc-Async-Task-Id"] = taskId.slice(0, 128);
    }
    return fetch(config.functionUrl, {
      method: "POST",
      headers,
      body,
      // An asynchronous FC invocation should return 202 in milliseconds.
      // Keep a short timeout so a broken trigger is retried quickly and the
      // durable transfer retry worker can take over.
      signal: AbortSignal.timeout(config.asyncInvocation ? 15_000 : 30 * 60_000)
    }).then(async (response) => {
      if (response.ok || (config.asyncInvocation && response.status === 409)) return;
      const message = (await response.text()).slice(0, 500);
      throw new Error(`Image function failed: HTTP ${response.status} ${message}`);
    });
  }

  dispatchInBackground(input: ImageTransferRequest) {
    const task = this.retryDispatch(`transfer ${input.resultId}`, () => this.dispatch(input));
    void task.catch((error) => {
      this.logger.error(`Image transfer permanently failed to dispatch for ${input.resultId}: ${error instanceof Error ? error.message : "unknown error"}`);
    });
    return task;
  }

  private async retryDispatch(label: string, dispatch: () => Promise<void>) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await dispatch();
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        this.logger.error(`Image function dispatch failed for ${label} (attempt ${attempt}/3): ${message}`);
        if (attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
      }
    }
  }

  matchesToken(token: string | undefined) {
    const expected = this.getConfig().bearerToken;
    return Boolean(expected) && timingSafeEqualStrings(token, expected);
  }

  private getConfig() {
    const value = this.config.get<ImageTransferConfig>("app.imageTransfer");
    return {
      functionUrl: (value?.functionUrl || "").replace(/\/+$/, ""),
      bearerToken: value?.bearerToken || "",
      asyncInvocation: value?.asyncInvocation !== false
    };
  }
}
