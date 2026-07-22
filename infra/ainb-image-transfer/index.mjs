import OSS from "ali-oss";
import { createHmac, timingSafeEqual } from "node:crypto";
import { setDefaultResultOrder } from "node:dns";

// Some API gateways publish AAAA records without a usable IPv6 route from FC.
setDefaultResultOrder("ipv4first");

const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 60 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30 * 60 * 1000;
const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function safeEndpoint(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "invalid-url";
  }
}

function errorDetails(error) {
  const value = error && typeof error === "object" ? error : {};
  const cause = value.cause && typeof value.cause === "object" ? value.cause : {};
  const socket = cause.socket && typeof cause.socket === "object" ? cause.socket : {};
  return {
    name: String(value.name || "Error"),
    message: String(value.message || error || "unknown error"),
    code: String(value.code || cause.code || ""),
    cause: String(cause.message || ""),
    errno: String(cause.errno || ""),
    syscall: String(cause.syscall || ""),
    localAddress: String(socket.localAddress || ""),
    remoteAddress: String(socket.remoteAddress || ""),
    remotePort: Number(socket.remotePort || 0) || undefined,
    bytesRead: Number(socket.bytesRead || 0) || undefined,
    bytesWritten: Number(socket.bytesWritten || 0) || undefined
  };
}

function logEvent(level, event, details = {}) {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), service: "lumi-image-function", event, ...details });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

function response(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(body) };
}

function parseIncomingEvent(event) {
  const runtimeParser = globalThis.parseEvent;
  const rawEvent = Buffer.isBuffer(event) ? event.toString("utf8") : event;
  const value = typeof runtimeParser === "function" ? runtimeParser(rawEvent) : typeof rawEvent === "string" ? JSON.parse(rawEvent) : rawEvent;
  let body = value?.body ?? value;
  if (value?.isBase64Encoded && typeof body === "string") body = Buffer.from(body, "base64").toString("utf8");
  const rawBody = typeof body === "string" ? body : JSON.stringify(body || {});
  return { body: typeof body === "string" ? JSON.parse(body || "{}") : body || {}, rawBody, headers: value?.headers || {} };
}

function header(headers, name) {
  const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key] || "") : "";
}

function verifyRequest(request) {
  const token = process.env.TRANSFER_CALLBACK_TOKEN || "";
  if (!token) throw new Error("function token is not configured");
  const authorization = header(request.headers, "authorization");
  if (authorization !== `Bearer ${token}`) throw new Error("unauthorized image function request");
  const timestamp = header(request.headers, "x-lumi-timestamp");
  const signature = header(request.headers, "x-lumi-signature");
  if (!timestamp && !signature) return;
  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) throw new Error("expired image function request");
  const expected = createHmac("sha256", token).update(`${timestamp}.${request.rawBody}`).digest("hex");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("invalid image function signature");
}

function assertPublicHttps(value, label) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS`);
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "::1" || /^(10|127|169\.254|192\.168)\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error(`${label} points to a private host`);
  }
  return url;
}

function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function typedParams(params, excluded = []) {
  return Object.fromEntries(Object.entries(params || {}).filter(([key, value]) => !excluded.includes(key) && value !== "").map(([key, value]) => [key, parseValue(String(value))]));
}

async function readResponseBody(upstream, trace = {}) {
  const length = Number(upstream.headers.get("content-length") || 0);
  if (length > MAX_RESPONSE_BYTES) throw new Error("provider response exceeds 60 MB");
  const startedAt = Date.now();
  logEvent("info", "response.body.start", { ...trace, contentLength: length || undefined });
  let buffer;
  try {
    buffer = Buffer.from(await upstream.arrayBuffer());
  } catch (error) {
    logEvent("error", "response.body.failed", { ...trace, elapsedMs: Date.now() - startedAt, contentLength: length || undefined, error: errorDetails(error) });
    const detail = errorDetails(error);
    throw new Error(`provider network response body failed: ${detail.code || detail.cause || detail.message}`, { cause: error });
  }
  if (buffer.byteLength > MAX_RESPONSE_BYTES) throw new Error("provider response exceeds 60 MB");
  logEvent("info", "response.body.complete", { ...trace, elapsedMs: Date.now() - startedAt, bytes: buffer.byteLength });
  return buffer;
}

async function requestJson(url, init, trace = {}) {
  const endpoint = safeEndpoint(url);
  const startedAt = Date.now();
  const requestTrace = { ...trace, endpoint, method: init?.method || "GET" };
  logEvent("info", "provider.request.start", requestTrace);
  let upstream;
  try {
    upstream = await fetch(assertPublicHttps(url, "provider endpoint"), { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    const detail = errorDetails(error);
    logEvent("error", "provider.request.failed", { ...requestTrace, phase: "headers", elapsedMs: Date.now() - startedAt, error: detail });
    throw new Error(`provider network request failed: ${detail.code || detail.cause || detail.message}`, { cause: error });
  }
  const responseTrace = { ...requestTrace, status: upstream.status, contentType: upstream.headers.get("content-type") || "", totalElapsedMs: Date.now() - startedAt };
  logEvent("info", "provider.response.headers", { ...responseTrace, contentLength: Number(upstream.headers.get("content-length") || 0) || undefined });
  const body = await readResponseBody(upstream, responseTrace);
  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch (error) {
    logEvent("error", "provider.response.invalid_json", { ...responseTrace, bytes: body.byteLength, elapsedMs: Date.now() - startedAt, error: errorDetails(error) });
    payload = null;
  }
  if (!upstream.ok || !payload) {
    const message = payload?.error?.message || payload?.message || body.toString("utf8").slice(0, 300) || `HTTP ${upstream.status}`;
    logEvent("error", "provider.response.rejected", { ...responseTrace, bytes: body.byteLength, elapsedMs: Date.now() - startedAt, upstreamMessage: String(message).slice(0, 300) });
    throw new Error(`provider request failed: ${message}`);
  }
  logEvent("info", "provider.request.complete", { ...responseTrace, bytes: body.byteLength, elapsedMs: Date.now() - startedAt });
  return payload;
}

async function downloadImage(url, trace = {}) {
  const startedAt = Date.now();
  const downloadTrace = { ...trace, endpoint: safeEndpoint(url) };
  logEvent("info", "image.download.start", downloadTrace);
  let upstream;
  try {
    upstream = await fetch(assertPublicHttps(url, "image URL"), { signal: AbortSignal.timeout(240_000) });
  } catch (error) {
    logEvent("error", "image.download.failed", { ...downloadTrace, phase: "headers", elapsedMs: Date.now() - startedAt, error: errorDetails(error) });
    throw error;
  }
  if (!upstream.ok) throw new Error(`image download failed: HTTP ${upstream.status}`);
  const contentType = (upstream.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) throw new Error("unsupported image content type");
  const buffer = await readResponseBody(upstream, { ...downloadTrace, status: upstream.status, contentType });
  if (!buffer.length || buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("image exceeds 40 MB");
  logEvent("info", "image.download.complete", { ...downloadTrace, elapsedMs: Date.now() - startedAt, bytes: buffer.byteLength, contentType });
  return { buffer, contentType };
}

function extension(contentType) {
  return contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
}

function validateImageBuffer(buffer, contentType) {
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer.subarray(0, 2).equals(Buffer.from([255, 216]));
  const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (!(png || jpeg || webp) || !ALLOWED_CONTENT_TYPES.has(contentType)) throw new Error("provider returned an invalid image");
}

function responseImageFormat(params) {
  const format = String(params?.output_format || "png").toLowerCase();
  return format === "jpg" || format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
}

function decodeBase64Image(value, fallbackContentType) {
  const source = String(value || "");
  const dataUri = source.match(/^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/i);
  const contentType = dataUri?.[1]?.toLowerCase() || fallbackContentType;
  const encoded = dataUri?.[2] || source;
  return { buffer: Buffer.from(encoded, "base64"), contentType };
}

function valuesAtPath(value, path) {
  if (!path) return [];
  let current = [value];
  for (const segment of String(path).split(".").filter(Boolean)) {
    const array = segment.endsWith("[]");
    const key = array ? segment.slice(0, -2) : segment;
    current = current.flatMap((item) => {
      const next = item && typeof item === "object" ? item[key] : undefined;
      if (array) return Array.isArray(next) ? next : [];
      return next === undefined || next === null ? [] : [next];
    });
  }
  return current;
}

function firstString(value, path) {
  const found = valuesAtPath(value, path).find((item) => typeof item === "string" && item);
  return found ? String(found) : "";
}

function asyncOutputs(payload, mapping, contentType) {
  const urls = valuesAtPath(payload, mapping.resultUrlPath || "data.data.data[].url").filter((item) => typeof item === "string");
  const base64 = valuesAtPath(payload, mapping.resultBase64Path || "data.data.data[].b64_json").filter((item) => typeof item === "string");
  return [...urls.map((url) => ({ url })), ...base64.map((data) => decodeBase64Image(data, contentType))];
}

function normalizedProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(1, Math.min(99, Math.round(numeric > 0 && numeric <= 1 ? numeric * 100 : numeric)));
}

async function pollAsyncProvider(provider, initialPayload, input, contentType, onProgress) {
  if (!provider.queryEndpoint) throw new Error("async provider query endpoint is not configured");
  const mapping = provider.responseMapping || {};
  const taskId = firstString(initialPayload, mapping.taskIdPath || "task_id") || firstString(initialPayload, "data.task_id") || firstString(initialPayload, "data.id");
  if (!taskId) throw new Error("provider response did not include task id");
  const queryUrl = provider.queryEndpoint.replace("{task_id}", encodeURIComponent(taskId)).replace("{taskId}", encodeURIComponent(taskId));
  const startedAt = Date.now();
  let pollCount = 0;
  logEvent("info", "provider.poll.start", { jobId: input.jobId, endpoint: safeEndpoint(queryUrl), taskIdLength: taskId.length });
  while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
    pollCount += 1;
    const payload = await requestJson(queryUrl, { headers: { Authorization: `Bearer ${provider.apiKey}`, Accept: "application/json" } }, { jobId: input.jobId, phase: "provider-poll", pollCount });
    const status = firstString(payload, mapping.statusPath || "data.status").toUpperCase();
    const providerProgress = valuesAtPath(payload, mapping.progressPath || "")[0];
    const progress = normalizedProgress(providerProgress);
    if (progress !== undefined && onProgress) await onProgress(progress);
    if (status === String(mapping.successValue || "SUCCESS").toUpperCase()) {
      const outputs = asyncOutputs(payload, mapping, contentType);
      if (!outputs.length) throw new Error("async provider returned no image");
      logEvent("info", "provider.poll.success", { jobId: input.jobId, pollCount, elapsedMs: Date.now() - startedAt, outputCount: outputs.length });
      return outputs;
    }
    if (status === String(mapping.failureValue || "FAILURE").toUpperCase()) throw new Error(firstString(payload, mapping.errorPath || "data.fail_reason") || "async provider generation failed");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error("async provider generation timeout");
}

async function runOpenAi(provider, input, onProgress) {
  const imageField = String(provider.params?.image_field || "image");
  const params = typedParams(provider.params, ["model", "prompt", "size", "n", "image", "image[]", "image_field"]);
  const model = provider.model || provider.params?.model || "gpt-image-2";
  const trace = { jobId: input.jobId, phase: "provider-generate", requestMode: provider.requestMode || "sync", mode: input.mode };
  if (input.mode === "image-to-image") {
    const reference = await downloadImage(input.inputImageUrl, { jobId: input.jobId, phase: "reference-image" });
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", input.prompt);
    form.append("size", input.size);
    form.append("n", String(input.count));
    for (const [key, value] of Object.entries(params)) form.append(key, String(value));
    form.append(imageField, new Blob([reference.buffer], { type: reference.contentType }), `reference.${extension(reference.contentType)}`);
    const payload = await requestJson(provider.endpoint, { method: "POST", headers: { Authorization: `Bearer ${provider.apiKey}`, Accept: "application/json" }, body: form }, trace);
    return provider.requestMode === "async" ? pollAsyncProvider(provider, payload, input, responseImageFormat(provider.params), onProgress) : parseOpenAiResponse(payload, responseImageFormat(provider.params));
  }
  const payload = await requestJson(provider.endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ...params, model, prompt: input.prompt, size: input.size, n: input.count })
  }, trace);
  return provider.requestMode === "async" ? pollAsyncProvider(provider, payload, input, responseImageFormat(provider.params), onProgress) : parseOpenAiResponse(payload, responseImageFormat(provider.params));
}

function parseOpenAiResponse(payload, defaultContentType) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return data.flatMap((item) => {
    if (typeof item?.b64_json === "string") return [decodeBase64Image(item.b64_json, defaultContentType)];
    if (typeof item?.url === "string") return [{ url: item.url }];
    return [];
  });
}

async function runGemini(provider, input) {
  const endpoint = provider.endpoint.replace("{model}", encodeURIComponent(provider.model));
  const reference = input.mode === "image-to-image" ? await downloadImage(input.inputImageUrl, { jobId: input.jobId, phase: "reference-image" }) : undefined;
  const outputs = [];
  const count = Math.max(1, input.count);
  for (let index = 0; index < count; index += 1) {
    const parts = [{ text: input.prompt }];
    if (reference) parts.push({ inlineData: { mimeType: reference.contentType, data: reference.buffer.toString("base64") } });
    const imageConfig = { ...typedParams(provider.params, ["model"]), imageSize: String(input.quality).match(/\b(1K|2K|4K)\b/i)?.[1]?.toUpperCase() || "1K", aspectRatio: input.ratio };
    const payload = await requestJson(endpoint, {
      method: "POST",
      headers: { "x-goog-api-key": provider.apiKey, "Content-Type": "application/json", Accept: "application/json", "X-Request-Id": `${input.jobId}-${index + 1}` },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { imageConfig } })
    }, { jobId: input.jobId, phase: "provider-generate", requestMode: "sync", mode: input.mode, outputIndex: index });
    for (const candidate of Array.isArray(payload?.candidates) ? payload.candidates : []) {
      for (const part of Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []) {
        const data = part?.inlineData || part?.inline_data;
        if (typeof data?.data === "string") outputs.push({ buffer: Buffer.from(data.data, "base64"), contentType: String(data.mimeType || data.mime_type || "image/png") });
      }
    }
  }
  return outputs;
}

async function putImage(client, objectKey, output, trace = {}) {
  const startedAt = Date.now();
  let image = output;
  if (output.url) image = await downloadImage(output.url, { ...trace, phase: "result-image" });
  validateImageBuffer(image.buffer, image.contentType);
  logEvent("info", "oss.upload.start", { ...trace, objectKey, bytes: image.buffer.byteLength, contentType: image.contentType });
  await client.put(objectKey, image.buffer, { headers: { "Content-Type": image.contentType } });
  logEvent("info", "oss.upload.complete", { ...trace, objectKey, bytes: image.buffer.byteLength, elapsedMs: Date.now() - startedAt });
  return { objectKey, sizeBytes: image.buffer.byteLength };
}

function callbackUrl() {
  if (process.env.GENERATION_CALLBACK_URL) return process.env.GENERATION_CALLBACK_URL;
  return String(process.env.API_CALLBACK_URL || "").replace(/\/transfers\/complete\/?$/, "/executions/complete");
}

async function notify(payload, url = callbackUrl()) {
  if (!url) throw new Error("generation callback URL is not configured");
  const startedAt = Date.now();
  let upstream;
  try {
    upstream = await fetch(assertPublicHttps(url, "callback URL"), {
      method: "POST",
      headers: { "content-type": "application/json", "x-lumi-transfer-token": process.env.TRANSFER_CALLBACK_TOKEN || "" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000)
    });
  } catch (error) {
    logEvent("error", "callback.failed", { jobId: payload?.jobId, endpoint: safeEndpoint(url), elapsedMs: Date.now() - startedAt, error: errorDetails(error) });
    throw error;
  }
  if (!upstream.ok) throw new Error(`callback failed: HTTP ${upstream.status}`);
  if (payload?.outputs || payload?.error) logEvent("info", "callback.complete", { jobId: payload?.jobId, endpoint: safeEndpoint(url), elapsedMs: Date.now() - startedAt, status: upstream.status, kind: payload?.error ? "failure" : "success" });
}

function ossClient(context) {
  return new OSS({ region: process.env.OSS_REGION, bucket: process.env.OSS_BUCKET, accessKeyId: context.credentials.accessKeyId, accessKeySecret: context.credentials.accessKeySecret, stsToken: context.credentials.securityToken, authorizationV4: true });
}

async function runGeneration(payload, context) {
  if (!payload.jobId || !payload.provider || !payload.input || !Array.isArray(payload.objectKeys) || !payload.objectKeys.length) throw new Error("invalid generation request");
  if (!payload.objectKeys.every((key) => typeof key === "string" && key.startsWith("uploads/system/generate/"))) throw new Error("invalid generation object key");
  const provider = payload.provider;
  const input = { ...payload.input, jobId: payload.jobId };
  const startedAt = Date.now();
  logEvent("info", "generation.start", {
    jobId: payload.jobId,
    invocationId: context?.requestId || context?.requestID || "",
    providerEndpoint: safeEndpoint(provider.endpoint),
    protocol: provider.protocol,
    requestMode: provider.requestMode || "sync",
    resultMode: provider.resultMode || "",
    mode: input.mode,
    size: input.size,
    quality: input.quality,
    count: input.count,
    promptLength: String(input.prompt || "").length
  });
  let progress = 8;
  let lastProviderProgressAt = 0;
  const stageForProgress = (value) => value < 28 ? "正在打草稿" : value < 48 ? "正在构思画面" : value < 68 ? "正在生成初稿" : value < 84 ? "正在润饰细节" : "即将完成";
  const reportProviderProgress = async (value) => {
    lastProviderProgressAt = Date.now();
    progress = Math.max(progress, Math.min(94, value));
    await notify({ jobId: payload.jobId, progress, stageText: stageForProgress(progress) });
  };
  const progressTimer = setInterval(() => {
    if (lastProviderProgressAt && Date.now() - lastProviderProgressAt < 15_000) return;
    progress = Math.min(92, progress + (progress < 55 ? 4 : 2));
    void notify({ jobId: payload.jobId, progress, stageText: stageForProgress(progress) }).catch(() => undefined);
  }, 10_000);
  try {
    const outputs = provider.protocol === "gemini" ? await runGemini(provider, input) : await runOpenAi(provider, input, reportProviderProgress);
    if (!outputs.length) throw new Error("provider returned no images");
    logEvent("info", "generation.outputs.ready", { jobId: payload.jobId, elapsedMs: Date.now() - startedAt, outputCount: outputs.length, outputTypes: outputs.map((item) => item.url ? "url" : "base64") });
    const client = ossClient(context);
    const stored = [];
    for (const [index, output] of outputs.slice(0, payload.objectKeys.length).entries()) stored.push(await putImage(client, payload.objectKeys[index], output, { jobId: payload.jobId, outputIndex: index }));
    if (!stored.length) throw new Error("provider returned no usable images");
    await notify({ jobId: payload.jobId, outputs: stored });
    logEvent("info", "generation.complete", { jobId: payload.jobId, elapsedMs: Date.now() - startedAt, outputCount: stored.length, totalBytes: stored.reduce((sum, item) => sum + item.sizeBytes, 0) });
    return { ok: true, outputs: stored };
  } finally {
    clearInterval(progressTimer);
  }
}

async function runTransfer(payload, context) {
  if (![payload.jobId, payload.resultId, payload.sourceUrl, payload.objectKey].every((item) => typeof item === "string" && item)) throw new Error("invalid transfer request");
  if (!payload.sourceUrl.startsWith("https://") || !payload.objectKey.startsWith("uploads/system/generate/")) throw new Error("invalid source or object key");
  const image = await downloadImage(payload.sourceUrl, { jobId: payload.jobId, resultId: payload.resultId, phase: "result-image" });
  const startedAt = Date.now();
  logEvent("info", "oss.upload.start", { jobId: payload.jobId, resultId: payload.resultId, objectKey: payload.objectKey, bytes: image.buffer.byteLength, contentType: image.contentType });
  await ossClient(context).put(payload.objectKey, image.buffer, { headers: { "Content-Type": image.contentType } });
  logEvent("info", "oss.upload.complete", { jobId: payload.jobId, resultId: payload.resultId, objectKey: payload.objectKey, bytes: image.buffer.byteLength, elapsedMs: Date.now() - startedAt });
  await notify({ jobId: payload.jobId, resultId: payload.resultId, objectKey: payload.objectKey, sizeBytes: image.buffer.byteLength }, process.env.API_CALLBACK_URL);
  return { ok: true };
}

export const handler = async (event, context) => {
  let request;
  let payload;
  try {
    request = parseIncomingEvent(event);
    verifyRequest(request);
    payload = request.body;
    logEvent("info", "invocation.accepted", { jobId: payload?.jobId, operation: payload?.operation || "transfer", invocationId: context?.requestId || context?.requestID || "" });
    if (payload.operation === "generate") return response(200, await runGeneration(payload, context));
    return response(200, await runTransfer(payload, context));
  } catch (error) {
    const message = error instanceof Error ? error.message : "image function failed";
    logEvent("error", "invocation.failed", { jobId: payload?.jobId, operation: payload?.operation || "unknown", invocationId: context?.requestId || context?.requestID || "", error: errorDetails(error) });
    try {
      if (payload?.operation === "generate" && payload.jobId) await notify({ jobId: payload.jobId, error: message });
      if (payload?.operation !== "generate" && payload?.jobId && payload?.resultId && payload?.objectKey) await notify({ jobId: payload.jobId, resultId: payload.resultId, objectKey: payload.objectKey, error: message }, process.env.API_CALLBACK_URL);
    } catch (callbackError) {
      logEvent("error", "failure_callback.failed", { jobId: payload?.jobId, error: errorDetails(callbackError) });
      // The API can retry stale jobs from its task recovery path.
    }
    return response(/unauthorized|signature|token/i.test(message) ? 401 : 500, { message });
  }
};
