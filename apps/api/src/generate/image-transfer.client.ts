import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";

type ImageTransferConfig = {
  functionUrl: string;
  bearerToken: string;
};

export type ImageTransferRequest = {
  operation?: "transfer";
  jobId: string;
  resultId: string;
  sourceUrl: string;
  objectKey: string;
};

export type ImageGenerationRequest = {
  operation: "generate";
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
  };
  input: {
    mode: string;
    prompt: string;
    inputImageUrl: string;
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
    return this.dispatchRequest({ ...input, operation: "transfer" }, 5 * 60_000);
  }

  dispatchGeneration(input: ImageGenerationRequest) {
    return this.dispatchRequest(input, 30 * 60_000);
  }

  private dispatchRequest(input: ImageTransferRequest | ImageGenerationRequest, timeoutMs: number) {
    const config = this.getConfig();
    if (!config.functionUrl || !config.bearerToken) throw new Error("Image transfer function is not configured");
    const body = JSON.stringify(input);
    const timestamp = String(Date.now());
    const signature = createHmac("sha256", config.bearerToken).update(`${timestamp}.${body}`).digest("hex");
    return fetch(config.functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.bearerToken}`,
        "Content-Type": "application/json",
        "X-Lumi-Timestamp": timestamp,
        "X-Lumi-Signature": signature
      },
      body,
      signal: AbortSignal.timeout(timeoutMs)
    }).then(async (response) => {
      if (response.ok) return;
      const message = (await response.text()).slice(0, 500);
      throw new Error(`Image function failed: HTTP ${response.status} ${message}`);
    });
  }

  dispatchInBackground(input: ImageTransferRequest) {
    void this.dispatch(input).catch((error) => {
      this.logger.error(`Image transfer dispatch failed for ${input.resultId}: ${error instanceof Error ? error.message : "unknown error"}`);
    });
  }

  matchesToken(token: string | undefined) {
    const expected = this.getConfig().bearerToken;
    return Boolean(expected && token && expected === token);
  }

  private getConfig() {
    const value = this.config.get<ImageTransferConfig>("app.imageTransfer");
    return {
      functionUrl: (value?.functionUrl || "").replace(/\/+$/, ""),
      bearerToken: value?.bearerToken || ""
    };
  }
}
