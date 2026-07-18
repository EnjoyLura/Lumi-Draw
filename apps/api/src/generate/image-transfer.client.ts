import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type ImageTransferConfig = {
  functionUrl: string;
  bearerToken: string;
};

export type ImageTransferRequest = {
  jobId: string;
  resultId: string;
  sourceUrl: string;
  objectKey: string;
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
    const config = this.getConfig();
    if (!config.functionUrl || !config.bearerToken) throw new Error("Image transfer function is not configured");
    return fetch(config.functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.bearerToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5 * 60_000)
    }).then(async (response) => {
      if (response.ok) return;
      const message = (await response.text()).slice(0, 500);
      throw new Error(`Image transfer function failed: HTTP ${response.status} ${message}`);
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
