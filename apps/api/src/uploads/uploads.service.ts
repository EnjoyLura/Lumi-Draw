import { createHmac, randomUUID } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
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
}
