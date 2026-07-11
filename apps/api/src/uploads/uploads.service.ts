import { createHmac, randomUUID } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const MAX_TRANSFER_BYTES = 30 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
};

type TransferRemoteImageResult = {
  imageUrl: string;
  ossKey: string;
  sizeBytes: number;
  contentType: string;
};

function encodeKeyPath(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  policy(scene: string, filename: string, contentType: string) {
    const oss = this.config.get<{ accessKeyId: string; accessKeySecret: string; bucket: string; endpoint: string }>("app.oss");
    if (!oss?.accessKeyId || !oss.accessKeySecret || !oss.bucket || !oss.endpoint) {
      throw new BadRequestException("OSS 未配置");
    }
    const dotExt = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
    const ext = EXT_BY_TYPE[contentType] ?? dotExt ?? "bin";
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const ossKey = `uploads/${scene}/${ym}/${randomUUID()}.${ext}`;
    const expires = Math.floor(Date.now() / 1000) + 3600;

    const resource = `/${oss.bucket}/${ossKey}`;
    const stringToSign = `PUT\n\n${contentType}\n${expires}\n${resource}`;
    const signature = createHmac("sha1", oss.accessKeySecret).update(stringToSign).digest("base64");

    const host = `https://${oss.bucket}.${oss.endpoint}`;
    const path = `${host}/${encodeKeyPath(ossKey)}`;
    const query = `OSSAccessKeyId=${encodeURIComponent(oss.accessKeyId)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`;

    return {
      uploadUrl: `${path}?${query}`,
      method: "PUT" as const,
      headers: { "Content-Type": contentType },
      publicUrl: path,
      ossKey
    };
  }

  complete(ossKey: string, publicUrl?: string) {
    const oss = this.config.get<{ bucket: string; endpoint: string }>("app.oss");
    const resolved = publicUrl ?? (oss?.bucket && oss.endpoint ? `https://${oss.bucket}.${oss.endpoint}/${encodeKeyPath(ossKey)}` : "");
    return { ok: true, ossKey, publicUrl: resolved };
  }

  /** Returns a short-lived GET URL when the configured OSS bucket is private. */
  readUrl(url: string) {
    const oss = this.config.get<{ accessKeyId: string; accessKeySecret: string; bucket: string; endpoint: string }>("app.oss");
    if (!url || !oss?.accessKeyId || !oss.accessKeySecret || !oss.bucket || !oss.endpoint) return url;

    const host = `https://${oss.bucket}.${oss.endpoint}`;
    if (!url.startsWith(`${host}/`)) return url;
    const rawKey = url.slice(host.length + 1).split("?")[0];
    if (!rawKey) return url;

    const ossKey = decodeURIComponent(rawKey);
    const expires = Math.floor(Date.now() / 1000) + 60 * 30;
    const resource = `/${oss.bucket}/${ossKey}`;
    const stringToSign = `GET\n\n\n${expires}\n${resource}`;
    const signature = createHmac("sha1", oss.accessKeySecret).update(stringToSign).digest("base64");
    const query = `OSSAccessKeyId=${encodeURIComponent(oss.accessKeyId)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`;
    return `${host}/${encodeKeyPath(ossKey)}?${query}`;
  }

  async transferRemoteImage(scene: string, sourceUrl: string): Promise<TransferRemoteImageResult> {
    const downloaded = await this.downloadImage(sourceUrl);
    const policy = this.policy(scene, `generated.${EXT_BY_TYPE[downloaded.contentType] ?? "jpg"}`, downloaded.contentType);
    const uploaded = await fetch(policy.uploadUrl, {
      method: "PUT",
      headers: policy.headers,
      body: downloaded.buffer
    });

    if (!uploaded.ok) {
      throw new BadRequestException(`OSS upload failed with HTTP ${uploaded.status}`);
    }

    return {
      imageUrl: policy.publicUrl,
      ossKey: policy.ossKey,
      sizeBytes: downloaded.buffer.byteLength,
      contentType: downloaded.contentType
    };
  }

  private async downloadImage(sourceUrl: string) {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new BadRequestException(`image download failed with HTTP ${response.status}`);

    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "image/jpeg";
    if (!EXT_BY_TYPE[contentType]) throw new BadRequestException("unsupported generated image type");

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_TRANSFER_BYTES) throw new BadRequestException("generated image is too large");
    return { buffer, contentType };
  }
}
