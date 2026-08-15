import test from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import type { ModelConfig } from "@prisma/client";
import { KieClient } from "./kie.client";

test("forwards every selected reference image to KIE image-to-image models", () => {
  const client = new KieClient({} as ConfigService);
  const build = (client as unknown as { buildCreateTaskBody: (input: Record<string, unknown>, callbackUrl: string, params: Record<string, string>) => Record<string, unknown> }).buildCreateTaskBody.bind(client);
  const body = build({
    jobId: "job-multi-reference",
    mode: "image-to-image",
    model: { id: "gpt-image-2", providerModel: "gpt-image-2" } as ModelConfig,
    prompt: "combine references",
    inputImageUrl: "https://cdn.example.com/one.png",
    inputImageUrls: ["https://cdn.example.com/one.png", "https://cdn.example.com/two.png"],
    ratio: "1:1",
    quality: "1K",
    count: 1
  }, "", {});

  assert.deepEqual((body.input as Record<string, unknown>).input_urls, ["https://cdn.example.com/one.png", "https://cdn.example.com/two.png"]);
});
