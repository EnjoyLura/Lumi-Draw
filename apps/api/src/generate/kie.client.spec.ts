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

test("uses administrator task and status response mappings", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    return new Response(JSON.stringify(url.includes("/status/")
      ? { job: { id: "mapped-task", state: "done", progress: 100, images: [{ url: "https://image.example.com/result.png" }] } }
      : { job: { id: "mapped-task" } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const config = { get: () => ({ callbackUrl: "" }) } as unknown as ConfigService;
    const client = new KieClient(config);
    const runtime = {
      apiBase: "https://custom.example.com/create",
      apiKey: "test-key",
      params: {},
      requestMode: "async" as const,
      queryEndpoint: "https://custom.example.com/status/{task_id}",
      statusEnabled: true,
      responseMapping: {
        taskIdPath: "job.id",
        statusPath: "job.state",
        progressPath: "job.progress",
        resultUrlPath: "job.images[].url",
        errorPath: "job.error",
        successValue: "done",
        failureValue: "failed",
        pendingValue: "running"
      }
    };
    const submitted = await client.submitGenerateJob({
      jobId: "job-id",
      mode: "text-to-image",
      model: { id: "custom", providerModel: "custom" } as ModelConfig,
      prompt: "test",
      inputImageUrl: "",
      ratio: "1:1",
      quality: "1K",
      count: 1
    }, runtime);
    const detail = await client.getTaskDetail(submitted.taskId, runtime);

    assert.equal(submitted.taskId, "mapped-task");
    assert.equal(calls[1], "https://custom.example.com/status/mapped-task");
    assert.equal(detail.status, "completed");
    assert.equal(detail.progress, 100);
    assert.equal(detail.resultJson, JSON.stringify({ resultUrls: ["https://image.example.com/result.png"] }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
