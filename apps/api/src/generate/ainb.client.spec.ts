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
    assert.equal(form.get("response_format"), "url");
    assert.equal(form.get("size"), "1024x1024");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses runtime platform config and omits unsupported optional parameters", async () => {
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
      apiBase: "https://backup.example.com",
      apiKey: "backup-key",
      params: { response_format: "url" }
    });
    const payload = JSON.parse(request?.body || "{}") as Record<string, unknown>;
    assert.equal(request?.url, "https://backup.example.com/v1/images/generations?async=true");
    assert.equal((request?.headers as Record<string, string>)?.Authorization, "Bearer backup-key");
    assert.equal(payload.response_format, "url");
    assert.equal("quality" in payload, false);
    assert.equal("output_format" in payload, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
