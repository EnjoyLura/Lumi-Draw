import OSS from "ali-oss";
import { Readable, Transform } from "node:stream";

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function response(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(body) };
}

function parseEvent(event) {
  const value = typeof event === "string" ? JSON.parse(event) : event;
  let body = value?.body || "";
  if (value?.isBase64Encoded) body = Buffer.from(body, "base64").toString("utf8");
  return { method: String(value?.requestContext?.http?.method || value?.method || "").toUpperCase(), body: JSON.parse(body || "{}") };
}

function limitStream() {
  let size = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (size > MAX_IMAGE_BYTES) return callback(new Error("image exceeds 30 MB"));
      callback(null, chunk);
    }
  });
}

async function notify(payload) {
  const response = await fetch(process.env.API_CALLBACK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-lumi-transfer-token": process.env.TRANSFER_CALLBACK_TOKEN },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000)
  });
  if (!response.ok) throw new Error(`callback failed: HTTP ${response.status}`);
}

export const handler = async (event, context) => {
  let payload;
  try {
    const request = parseEvent(event);
    if (request.method !== "POST") return response(405, { message: "method not allowed" });
    payload = request.body;
    if (![payload.jobId, payload.resultId, payload.sourceUrl, payload.objectKey].every((item) => typeof item === "string" && item)) {
      return response(400, { message: "invalid transfer request" });
    }
    if (!payload.sourceUrl.startsWith("https://") || !payload.objectKey.startsWith("uploads/system/generate/")) {
      return response(400, { message: "invalid source or object key" });
    }

    const upstream = await fetch(payload.sourceUrl, { signal: AbortSignal.timeout(240_000) });
    if (!upstream.ok || !upstream.body) throw new Error(`source download failed: HTTP ${upstream.status}`);
    const contentType = (upstream.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) throw new Error("unsupported image content type");
    const length = Number(upstream.headers.get("content-length") || 0);
    if (length > MAX_IMAGE_BYTES) throw new Error("image exceeds 30 MB");

    const client = new OSS({
      region: process.env.OSS_REGION,
      bucket: process.env.OSS_BUCKET,
      accessKeyId: context.credentials.accessKeyId,
      accessKeySecret: context.credentials.accessKeySecret,
      stsToken: context.credentials.securityToken,
      authorizationV4: true
    });
    const stream = Readable.fromWeb(upstream.body).pipe(limitStream());
    await client.put(payload.objectKey, stream, { headers: { "Content-Type": contentType } });
    await notify({ jobId: payload.jobId, resultId: payload.resultId, objectKey: payload.objectKey, sizeBytes: length });
    return response(200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "image transfer failed";
    if (payload?.jobId && payload?.resultId && payload?.objectKey) {
      await notify({ jobId: payload.jobId, resultId: payload.resultId, objectKey: payload.objectKey, error: message }).catch(() => undefined);
    }
    return response(500, { message });
  }
};
