import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { Change2ProClient, normalizeImage2Size, resolveChange2ProModel } from "./change2pro.client";

function client(keys = { imageApiKey: "image-key", bananaApiKey: "banana-key" }) {
  const config = {
    get(name: string) {
      if (name === "app.change2pro") return { apiBase: "https://api.example.com", ...keys };
      if (name === "app.oss") return { bucket: "bucket", endpoint: "oss.example.com", cdnBaseUrl: "https://cdn.example.com" };
      return undefined;
    }
  } as ConfigService;
  return new Change2ProClient(config);
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

test("routes Image 2 and both Banana models to Change2Pro", () => {
  assert.deepEqual(resolveChange2ProModel("gpt-image-2"), { kind: "image2", providerModel: "gpt-image-2" });
  assert.deepEqual(resolveChange2ProModel("nano-banana-2"), { kind: "banana", providerModel: "gemini-3.1-flash-image-preview" });
  assert.deepEqual(resolveChange2ProModel("nano-banana-pro"), { kind: "banana", providerModel: "gemini-3-pro-image-preview" });
  assert.equal(resolveChange2ProModel("seedream-4-5"), undefined);
});

test("maps Image 2 ratios and quality tiers to image sizes", () => {
  assert.equal(normalizeImage2Size("16:9", "1K"), "1536x864");
  assert.equal(normalizeImage2Size("9:16", "2K"), "1152x2048");
  assert.equal(normalizeImage2Size("1:1", "4K"), "2880x2880");
  assert.equal(normalizeImage2Size("3:4", "4K"), "2480x3312");
  assert.throws(() => normalizeImage2Size("7:5", "4K"), /当前模型不支持所选图片尺寸/);
});

test("Image 2 supports both text generation and image edits", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === "https://cdn.example.com/reference.png") {
      return new Response(Buffer.from([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } });
    }
    return jsonResponse({ data: [{ url: "https://images.example.com/result.png" }] });
  };

  try {
    const provider = client();
    const requests: Array<{ type: string; url: string; payload?: Record<string, unknown>; input?: Record<string, unknown> }> = [];
    (provider as unknown as { requestImage2Json: (url: string, key: string, id: string, payload: Record<string, unknown>) => Promise<Record<string, unknown>> }).requestImage2Json = async (url, _key, _id, payload) => {
      requests.push({ type: "json", url, payload });
      return { data: [{ url: "https://images.example.com/result.png" }] };
    };
    (provider as unknown as { requestImage2Form: (url: string, key: string, input: Record<string, unknown>, reference: unknown) => Promise<Record<string, unknown>> }).requestImage2Form = async (url, _key, input) => {
      requests.push({ type: "form", url, input });
      return { data: [{ url: "https://images.example.com/result.png" }] };
    };
    await provider.generate({
      jobId: "job-text",
      modelId: "gpt-image-2",
      mode: "text-to-image",
      prompt: "orange cat",
      inputImageUrl: "",
      ratio: "16:9",
      quality: "2K",
      count: 1
    });
    await provider.generate({
      jobId: "job-edit",
      modelId: "gpt-image-2",
      mode: "image-to-image",
      prompt: "watercolor style",
      inputImageUrl: "https://cdn.example.com/reference.png",
      ratio: "3:4",
      quality: "2K",
      count: 1
    });

    assert.deepEqual(requests[0], {
      type: "json",
      url: "https://api.example.com/v1/images/generations",
      payload: {
        model: "gpt-image-2",
        prompt: "orange cat",
        n: 1,
        size: "2048x1152",
        quality: "high",
        response_format: "url"
      }
    });
    assert.equal(requests[1].type, "form");
    assert.equal(requests[1].url, "https://api.example.com/v1/images/edits");
    assert.equal(requests[1].input?.prompt, "watercolor style");
    assert.equal(requests[1].input?.ratio, "3:4");
    assert.equal(requests[1].input?.quality, "2K");
    assert.equal(calls[0].url, "https://cdn.example.com/reference.png");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Banana supports text generation and inline reference image generation", async () => {
  const originalFetch = globalThis.fetch;
  const requestBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://cdn.example.com/reference.jpg") {
      return new Response(Buffer.from([255, 216, 255]), { headers: { "Content-Type": "image/jpeg" } });
    }
    requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return jsonResponse({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: Buffer.from("generated").toString("base64") } }] } }]
    });
  };

  try {
    const provider = client();
    const textOutputs = await provider.generate({
      jobId: "banana-text",
      modelId: "nano-banana-2",
      mode: "text-to-image",
      prompt: "orange cat",
      inputImageUrl: "",
      ratio: "9:16",
      quality: "4K",
      count: 1
    });
    const editOutputs = await provider.generate({
      jobId: "banana-edit",
      modelId: "nano-banana-2",
      mode: "image-to-image",
      prompt: "change clothes",
      inputImageUrl: "https://cdn.example.com/reference.jpg",
      ratio: "3:4",
      quality: "2K",
      count: 1
    });

    const textParts = ((requestBodies[0].contents as Array<{ parts: unknown[] }>)[0].parts);
    const editParts = ((requestBodies[1].contents as Array<{ parts: Array<Record<string, unknown>> }>)[0].parts);
    assert.equal(textParts.length, 1);
    assert.equal(editParts.length, 2);
    assert.deepEqual(editParts[1], { inlineData: { mimeType: "image/jpeg", data: Buffer.from([255, 216, 255]).toString("base64") } });
    assert.equal(textOutputs[0].buffer?.toString(), "generated");
    assert.equal(editOutputs[0].contentType, "image/png");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects reference images outside the configured OSS and CDN hosts", async () => {
  await assert.rejects(
    client().generate({
      jobId: "unsafe-reference",
      modelId: "nano-banana-2",
      mode: "image-to-image",
      prompt: "edit",
      inputImageUrl: "https://untrusted.example.com/reference.jpg",
      ratio: "1:1",
      quality: "1K",
      count: 1
    }),
    /参考图地址无效/
  );
});

test("preserves provider content-safety rejections as an actionable message", () => {
  const provider = client();
  const validate = (provider as unknown as {
    validateJsonResponse: (status: number, payload: Record<string, unknown>) => Record<string, unknown>;
  }).validateJsonResponse.bind(provider);

  assert.throws(
    () => validate(451, { error: { message: "The generated images appear to be unsafe." } }),
    /内容可能不安全，请修改提示词重试/
  );
});

test("uses the final HTTP response status when curl follows redirects", () => {
  const provider = client();
  const lastHttpStatus = (provider as unknown as { lastHttpStatus: (headers: string) => number }).lastHttpStatus.bind(provider);

  assert.equal(lastHttpStatus("HTTP/1.1 302 Found\r\nLocation: /next\r\n\r\nHTTP/1.1 200 OK\r\n"), 200);
});
