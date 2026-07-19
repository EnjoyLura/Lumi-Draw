import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { AinbClient } from "./ainb.client";

function client() {
  const config = {
    get(name: string) {
      if (name === "app.ainb") return { apiBase: "https://ainb.example.com", imageApiKey: "test-key" };
      if (name === "app.oss") return { bucket: "bucket", endpoint: "oss.example.com", cdnBaseUrl: "https://cdn.example.com" };
      return undefined;
    }
  } as ConfigService;
  return new AinbClient(config);
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

test("submits asynchronous Ainb text generation and resolves URL output", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("/tasks/")) return jsonResponse({ data: { status: "SUCCESS", data: { data: [{ url: "https://image.example.com/result.png" }] } } });
    return jsonResponse({ task_id: "task-123" });
  };

  try {
    const provider = client();
    const { taskId } = await provider.submit({
      mode: "text-to-image",
      prompt: "可爱的小猫",
      inputImageUrl: "",
      ratio: "16:9",
      quality: "4K",
      count: 1
    });
    const outputs = await provider.waitForOutputs(taskId);
    assert.equal(taskId, "task-123");
    assert.equal(calls[0].url, "https://ainb.example.com/v1/images/generations?async=true");
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
      model: "gpt-image-2",
      prompt: "可爱的小猫",
      size: "3840x2160",
      quality: "high",
      n: 1,
      response_format: "url",
      output_format: "png"
    });
    assert.deepEqual(outputs, [{ url: "https://image.example.com/result.png" }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("submits Ainb image edits as async multipart requests", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === "https://cdn.example.com/reference.png") return new Response(Buffer.from([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } });
    return jsonResponse({ task_id: "task-edit" });
  };

  try {
    const provider = client();
    const { taskId } = await provider.submit({
      mode: "image-to-image",
      providerModel: "image2-edit-vip",
      prompt: "把背景换成蓝天白云",
      inputImageUrl: "https://cdn.example.com/reference.png",
      ratio: "1:1",
      quality: "1K",
      count: 1
    });
    const request = calls.at(-1);
    const form = request?.init?.body as FormData;
    assert.equal(taskId, "task-edit");
    assert.equal(request?.url, "https://ainb.example.com/v1/images/edits?async=true");
    assert.equal(form.get("image[]") instanceof Blob, true);
    assert.equal(form.get("model"), "image2-edit-vip");
    assert.equal(form.get("response_format"), "url");
    assert.equal(form.get("size"), "1024x1024");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("splits multi-image Ainb edits into independent single-image tasks", async () => {
  const originalFetch = globalThis.fetch;
  const submittedForms: FormData[] = [];
  let referenceDownloads = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://cdn.example.com/reference.png") {
      referenceDownloads += 1;
      return new Response(Buffer.from([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } });
    }
    if (url.includes("/v1/images/tasks/")) {
      const id = decodeURIComponent(url.split("/").at(-1) || "");
      return jsonResponse({ data: { status: "SUCCESS", data: { data: [{ url: `https://image.example.com/${id}.png` }] } } });
    }
    submittedForms.push(init?.body as FormData);
    return jsonResponse({ task_id: `task-edit-${submittedForms.length}` });
  };

  try {
    const provider = client();
    const { taskId } = await provider.submit({
      mode: "image-to-image",
      prompt: "watercolor",
      inputImageUrl: "https://cdn.example.com/reference.png",
      ratio: "3:4",
      quality: "2K",
      count: 2
    });
    const outputs = await provider.waitForOutputs(taskId);

    assert.equal(referenceDownloads, 1);
    assert.equal(submittedForms.length, 2);
    assert.deepEqual(submittedForms.map((form) => form.get("n")), ["1", "1"]);
    assert.deepEqual(outputs, [
      { url: "https://image.example.com/task-edit-1.png" },
      { url: "https://image.example.com/task-edit-2.png" }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses the configured full endpoint and forwards administrator-defined parameters", async () => {
  const originalFetch = globalThis.fetch;
  let request: { url: string; headers?: RequestInit["headers"]; body?: string } | undefined;
  globalThis.fetch = async (input, init) => {
    request = { url: String(input), headers: init?.headers, body: String(init?.body) };
    return jsonResponse({ task_id: "runtime-task" });
  };

  try {
    await client().submit({
      mode: "text-to-image",
      prompt: "测试参数",
      inputImageUrl: "",
      ratio: "1:1",
      quality: "1K",
      count: 1
    }, {
      apiBase: "https://backup.example.com/custom/generate?async=true",
      apiKey: "backup-key",
      params: { model: "image2-vip", response_format: "url", background: "transparent" }
    });
    const payload = JSON.parse(request?.body || "{}") as Record<string, unknown>;
    assert.equal(request?.url, "https://backup.example.com/custom/generate?async=true");
    assert.equal((request?.headers as Record<string, string>)?.Authorization, "Bearer backup-key");
    assert.equal(payload.response_format, "url");
    assert.equal(payload.background, "transparent");
    assert.equal(payload.model, "image2-vip");
    assert.equal("quality" in payload, false);
    assert.equal("output_format" in payload, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses custom task paths, query endpoint, and provider progress", async () => {
  const originalFetch = globalThis.fetch;
  let queryCount = 0;
  const observedProgress: number[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/jobs/")) {
      queryCount += 1;
      return queryCount === 1
        ? jsonResponse({ job: { state: "running", progress: 42 } })
        : jsonResponse({ job: { state: "done", progress: 100, outputs: [{ src: "https://image.example.com/custom.png" }] } });
    }
    return jsonResponse({ job: { id: "custom-task" } });
  };

  try {
    const runtime = {
      apiBase: "https://custom.example.com/v1/generate",
      apiKey: "custom-key",
      params: { model: "gpt-image-2" },
      requestMode: "async" as const,
      queryEndpoint: "https://custom.example.com/jobs/{task_id}",
      statusEnabled: true,
      responseMapping: {
        taskIdPath: "job.id",
        statusPath: "job.state",
        progressPath: "job.progress",
        resultUrlPath: "job.outputs[].src",
        errorPath: "job.error",
        successValue: "done",
        failureValue: "failed",
        pendingValue: "running"
      }
    };
    const provider = client();
    const submitted = await provider.submit({
      mode: "text-to-image",
      prompt: "custom polling",
      inputImageUrl: "",
      ratio: "1:1",
      quality: "1K",
      count: 1
    }, runtime);
    const outputs = await provider.waitForOutputs(submitted.taskId, (_elapsed, progress) => {
      if (progress !== undefined) observedProgress.push(progress);
    }, runtime);

    assert.equal(submitted.taskId, "custom-task");
    assert.deepEqual(observedProgress, [42]);
    assert.deepEqual(outputs, [{ url: "https://image.example.com/custom.png" }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
