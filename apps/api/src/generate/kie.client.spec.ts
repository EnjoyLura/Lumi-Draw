import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import type { ModelConfig } from "@prisma/client";
import { KieClient } from "./kie.client";

test("uses the administrator model parameter as the top-level KIE model", () => {
  const client = new KieClient({} as ConfigService);
  const build = (client as unknown as {
    buildCreateTaskBody: (
      input: Record<string, unknown>,
      callbackUrl: string,
      params: Record<string, string>
    ) => Record<string, unknown>;
  }).buildCreateTaskBody.bind(client);
  const body = build({
    jobId: "job-custom-model",
    mode: "text-to-image",
    model: { id: "gpt-image-2", providerModel: "gpt-image-2" } as ModelConfig,
    prompt: "orange cat",
    inputImageUrl: "",
    ratio: "1:1",
    quality: "1K",
    count: 1
  }, "", { model: "image2-vip", vendor_option: "fast" });

  assert.equal(body.model, "image2-vip");
  assert.deepEqual(body.input, {
    vendor_option: "fast",
    prompt: "orange cat",
    aspect_ratio: "1:1",
    resolution: "1K"
  });
});
