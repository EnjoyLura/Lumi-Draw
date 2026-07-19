import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_TRANSFER_BYTES = 30 * 1024 * 1024;
const UPLOAD_EXPIRES_SECONDS = 5 * 60;
const PRIVATE_READ_EXPIRES_SECONDS = 30 * 60;
// A short, stable URL bucket lets WeChat reuse the same image cache entry while
// leaving ample headroom for the CDN's Type A authentication validity window.
const CDN_AUTH_URL_WINDOW_SECONDS = 5 * 60;
const LIST_IMAGE_PROCESS = "image/resize,w_640/quality,q_70/format,webp";
const DETAIL_IMAGE_PROCESS = LIST_IMAGE_PROCESS;
const ADMIN_THUMBNAIL_IMAGE_PROCESS = "image/resize,w_480/quality,q_70/format,webp";
const ADMIN_PREVIEW_IMAGE_PROCESS = "image/resize,w_1200/quality,q_80/format,webp";
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
};

type UploadScene = "avatar" | "prompt-image" | "feedback" | "work";
type UploadClaim = {
  userId: number;
  ossKey: string;
  contentType: string;
  sizeBytes: number;
  expiresAt: number;
};

type TransferRemoteImageResult = {
  imageUrl: string;
  ossKey: string;
  sizeBytes: number;
  contentType: string;
};

type OssConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint: string;
  cdnBaseUrl?: string;
  cdnAuthKey?: string;
};

function encodeKeyPath(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  policy(userId: number, scene: UploadScene, filename: string, contentType: string, sizeBytes: number) {
    this.assertUploadInput(filename, contentType, sizeBytes);
    const ossKey = `uploads/user-${userId}/${scene}/${this.yearMonth()}/${randomUUID()}.${EXT_BY_TYPE[contentType]}`;
    const policy = this.createPutPolicy(ossKey, contentType);
    const expiresAt = Math.floor(Date.now() / 1000) + UPLOAD_EXPIRES_SECONDS;
    return { ...policy, uploadToken: this.createUploadToken({ userId, ossKey, contentType, sizeBytes, expiresAt }) };
  }

  async complete(userId: number, ossKey: string, uploadToken: string) {
    const claim = this.parseUploadToken(uploadToken);
    if (claim.userId !== userId || claim.ossKey !== ossKey || !ossKey.startsWith(`uploads/user-${userId}/`)) {
      throw new ForbiddenException("无权完成该上传");
    }

    try {
      const meta = await this.readObjectMeta(ossKey);
      if (meta.contentType !== claim.contentType || meta.sizeBytes !== claim.sizeBytes || !(await this.hasImageSignature(ossKey, claim.contentType))) {
        throw new BadRequestException("上传文件校验失败，请重新选择图片");
      }
    } catch (error) {
      await this.deleteObject(ossKey).catch(() => undefined);
      throw error;
    }
    return { ok: true, ossKey, publicUrl: this.objectUrl(ossKey) };
  }

  async uploadBuffer(scene: string, filename: string, contentType: string, buffer: Buffer) {
    this.assertImageType(contentType);
    if (!buffer.length) throw new BadRequestException("上传图片不能为空");
    if (buffer.byteLength > MAX_TRANSFER_BYTES) throw new BadRequestException("上传图片不能超过 30MB");

    const policy = this.createPutPolicy(this.createSystemKey(scene, contentType), contentType);
    const uploaded = await fetch(policy.uploadUrl, { method: "PUT", headers: policy.headers, body: buffer });
    if (!uploaded.ok) throw new BadRequestException(`OSS upload failed with HTTP ${uploaded.status}`);
    return { imageUrl: policy.publicUrl, ossKey: policy.ossKey, sizeBytes: buffer.byteLength, contentType };
  }

  readUrl(url: string, visibility: "private" | "public" = "private") {
    const oss = this.ossConfig();
    if (!url) return url;
    const ossKey = this.objectKeyFromUrl(url, oss);
    if (!ossKey) return url;
    if ((visibility === "public" || oss.cdnAuthKey) && oss.cdnBaseUrl) return this.cdnObjectUrl(oss, ossKey);
    // Keep a private URL stable inside its existing 30-minute validity window.
    // A freshly calculated expiry on every API response changes the image src and
    // prevents WeChat's native disk cache from reusing an unchanged image.
    return this.signedObjectUrl("GET", ossKey, PRIVATE_READ_EXPIRES_SECONDS, "", this.privateReadExpiry());
  }

  readStyledPublicUrl(url: string, styleName: string) {
    const oss = this.ossConfig();
    if (!url || !styleName || !oss.cdnBaseUrl) return this.readUrl(url, "public");
    const ossKey = this.objectKeyFromUrl(url, oss);
    if (!ossKey) return this.readUrl(url, "public");
    return this.cdnObjectUrl(oss, ossKey, `style/${encodeURIComponent(styleName)}`);
  }

  readResponsiveImageUrl(url: string, visibility: "private" | "public" = "private") {
    return this.readProcessedImageUrl(url, visibility, LIST_IMAGE_PROCESS);
  }

  readDetailPreviewImageUrl(url: string, visibility: "private" | "public" = "private") {
    return this.readProcessedImageUrl(url, visibility, DETAIL_IMAGE_PROCESS);
  }

  readAdminThumbnailImageUrl(url: string, visibility: "private" | "public" = "private") {
    return this.readProcessedImageUrl(url, visibility, ADMIN_THUMBNAIL_IMAGE_PROCESS);
  }

  readAdminPreviewImageUrl(url: string, visibility: "private" | "public" = "private") {
    return this.readProcessedImageUrl(url, visibility, ADMIN_PREVIEW_IMAGE_PROCESS);
  }

  private readProcessedImageUrl(url: string, visibility: "private" | "public", imageProcess: string) {
    const oss = this.ossConfig();
    if (!url) return url;
    const ossKey = this.objectKeyFromUrl(url, oss);
    if (!ossKey) return url;
    if ((visibility === "public" || oss.cdnAuthKey) && oss.cdnBaseUrl) {
      return this.cdnObjectUrl(oss, ossKey, imageProcess);
    }
    return this.signedObjectUrl("GET", ossKey, PRIVATE_READ_EXPIRES_SECONDS, "", this.privateReadExpiry(), imageProcess);
  }

  async transferRemoteImage(scene: string, sourceUrl: string): Promise<TransferRemoteImageResult> {
    const downloaded = await this.downloadImage(sourceUrl);
    const policy = this.createPutPolicy(this.createSystemKey(scene, downloaded.contentType), downloaded.contentType);
    const uploaded = await fetch(policy.uploadUrl, { method: "PUT", headers: policy.headers, body: downloaded.buffer });
    if (!uploaded.ok) throw new BadRequestException(`OSS upload failed with HTTP ${uploaded.status}`);
    return { imageUrl: policy.publicUrl, ossKey: policy.ossKey, sizeBytes: downloaded.buffer.byteLength, contentType: downloaded.contentType };
  }

  reserveSystemImage(scene: string, contentType = "image/png") {
    this.assertImageType(contentType);
    const ossKey = this.createSystemKey(scene, contentType);
    return { ossKey, imageUrl: this.objectUrl(ossKey) };
  }

  objectUrlForKey(ossKey: string) {
    return this.objectUrl(ossKey);
  }

  private assertUploadInput(filename: string, contentType: string, sizeBytes: number) {
    if (!filename.trim() || filename.includes("/") || filename.includes("\\")) throw new BadRequestException("文件名不合法");
    this.assertImageType(contentType);
    if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_UPLOAD_BYTES) {
      throw new BadRequestException("上传图片不能超过 10MB");
    }
  }

  private assertImageType(contentType: string) {
    if (!EXT_BY_TYPE[contentType]) throw new BadRequestException("仅支持 PNG、JPG、WEBP 或 GIF 图片");
  }

  private createPutPolicy(ossKey: string, contentType: string) {
    this.assertImageType(contentType);
    const expiresAt = Math.floor(Date.now() / 1000) + UPLOAD_EXPIRES_SECONDS;
    return {
      uploadUrl: this.signedObjectUrl("PUT", ossKey, UPLOAD_EXPIRES_SECONDS, contentType, expiresAt),
      method: "PUT" as const,
      headers: { "Content-Type": contentType },
      publicUrl: this.objectUrl(ossKey),
      ossKey
    };
  }

  private createSystemKey(scene: string, contentType: string) {
    this.assertImageType(contentType);
    return `uploads/system/${scene.replace(/[^a-z0-9-]/gi, "") || "image"}/${this.yearMonth()}/${randomUUID()}.${EXT_BY_TYPE[contentType]}`;
  }

  private async readObjectMeta(ossKey: string) {
    const response = await fetch(this.signedObjectUrl("HEAD", ossKey, 60), { method: "HEAD" });
    if (!response.ok) throw new BadRequestException("上传文件不存在或已过期");
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || "";
    const sizeBytes = Number.parseInt(response.headers.get("content-length") || "", 10);
    this.assertImageType(contentType);
    if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_UPLOAD_BYTES) throw new BadRequestException("上传图片大小不合法");
    return { contentType, sizeBytes };
  }

  private async hasImageSignature(ossKey: string, contentType: string) {
    const response = await fetch(this.signedObjectUrl("GET", ossKey, 60), { headers: { Range: "bytes=0-31" } });
    if (!response.ok) return false;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (contentType === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
    if (contentType === "image/jpeg" || contentType === "image/jpg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (contentType === "image/gif") {
      const signature = String.fromCharCode(...bytes.slice(0, 6));
      return bytes.length >= 6 && (signature === "GIF87a" || signature === "GIF89a");
    }
    if (contentType === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    return false;
  }

  private async deleteObject(ossKey: string) {
    await fetch(this.signedObjectUrl("DELETE", ossKey, 60) as string, { method: "DELETE" });
  }

  private objectUrl(ossKey: string) {
    return `${this.objectHost(this.ossConfig())}/${encodeKeyPath(ossKey)}`;
  }

  private cdnObjectUrl(oss: OssConfig, ossKey: string, imageProcess?: string) {
    const pathname = `/${encodeKeyPath(ossKey)}`;
    const processQuery = imageProcess ? `x-oss-process=${encodeURIComponent(imageProcess)}` : "";
    if (!oss.cdnAuthKey) return `${oss.cdnBaseUrl}${pathname}${processQuery ? `?${processQuery}` : ""}`;

    // Alibaba Cloud CDN Type A: md5(path-timestamp-rand-uid-key).
    // The CDN strips auth_key before producing its cache key, so different users
    // still share the same cached object and image-processing variant.
    const timestamp = Math.floor(Math.floor(Date.now() / 1000) / CDN_AUTH_URL_WINDOW_SECONDS) * CDN_AUTH_URL_WINDOW_SECONDS;
    const authKey = createHash("md5").update(`${pathname}-${timestamp}-0-0-${oss.cdnAuthKey}`).digest("hex");
    const authQuery = `auth_key=${timestamp}-0-0-${authKey}`;
    return `${oss.cdnBaseUrl}${pathname}?${processQuery ? `${processQuery}&` : ""}${authQuery}`;
  }

  private signedObjectUrl(
    method: "GET" | "PUT" | "HEAD" | "DELETE",
    ossKey: string,
    ttlSeconds: number,
    contentType = "",
    expiresAt?: number,
    imageProcess?: string,
  ) {
    const oss = this.ossConfig();
    const expires = expiresAt ?? Math.floor(Date.now() / 1000) + ttlSeconds;
    const resource = `/${oss.bucket}/${ossKey}`;
    const canonicalResource = imageProcess ? `${resource}?x-oss-process=${imageProcess}` : resource;
    const signature = createHmac("sha1", oss.accessKeySecret).update(`${method}\n\n${contentType}\n${expires}\n${canonicalResource}`).digest("base64");
    const processQuery = imageProcess ? `x-oss-process=${encodeURIComponent(imageProcess)}&` : "";
    const query = `${processQuery}OSSAccessKeyId=${encodeURIComponent(oss.accessKeyId)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`;
    return `${this.objectHost(oss)}/${encodeKeyPath(ossKey)}?${query}`;
  }

  private privateReadExpiry() {
    const now = Math.floor(Date.now() / 1000);
    return (Math.floor(now / PRIVATE_READ_EXPIRES_SECONDS) + 1) * PRIVATE_READ_EXPIRES_SECONDS;
  }

  private objectHost(oss: OssConfig) {
    return `https://${oss.bucket}.${oss.endpoint}`;
  }

  private objectKeyFromUrl(url: string, oss: OssConfig) {
    const sources = [this.objectHost(oss), oss.cdnBaseUrl].filter((value): value is string => Boolean(value));
    for (const source of sources) {
      try {
        const base = new URL(`${source.replace(/\/+$/, "")}/`);
        const candidate = new URL(url);
        if (candidate.origin !== base.origin || !candidate.pathname.startsWith(base.pathname)) continue;
        const encodedKey = candidate.pathname.slice(base.pathname.length);
        if (encodedKey) return decodeURIComponent(encodedKey);
      } catch {
        // Non-HTTP and third-party image URLs are returned unchanged.
      }
    }
    return "";
  }

  private ossConfig() {
    const oss = this.config.get<OssConfig>("app.oss");
    if (!oss?.accessKeyId || !oss.accessKeySecret || !oss.bucket || !oss.endpoint) throw new BadRequestException("OSS 未配置");
    return oss;
  }

  private createUploadToken(claim: UploadClaim) {
    const payload = Buffer.from(JSON.stringify(claim)).toString("base64url");
    return `${payload}.${this.signUploadPayload(payload)}`;
  }

  private parseUploadToken(token: string): UploadClaim {
    const [payload, signature, ...extra] = token.split(".");
    if (!payload || !signature || extra.length || !this.matchesSignature(payload, signature)) throw new ForbiddenException("上传授权无效");
    try {
      const claim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadClaim;
      if (!Number.isInteger(claim.userId) || !claim.ossKey || !EXT_BY_TYPE[claim.contentType] || !Number.isInteger(claim.sizeBytes) || claim.expiresAt < Math.floor(Date.now() / 1000)) {
        throw new Error("invalid claim");
      }
      return claim;
    } catch {
      throw new ForbiddenException("上传授权无效");
    }
  }

  private signUploadPayload(payload: string) {
    const secret = this.config.get<string>("app.callbackSecret");
    if (!secret) throw new BadRequestException("上传服务未配置");
    return createHmac("sha256", secret).update(payload).digest("base64url");
  }

  private matchesSignature(payload: string, signature: string) {
    const expected = Buffer.from(this.signUploadPayload(payload));
    const received = Buffer.from(signature);
    return expected.length === received.length && timingSafeEqual(expected, received);
  }

  private yearMonth() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  private async downloadImage(sourceUrl: string) {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new BadRequestException(`image download failed with HTTP ${response.status}`);
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || "image/jpeg";
    this.assertImageType(contentType);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.byteLength > MAX_TRANSFER_BYTES) throw new BadRequestException("generated image is too large");
    return { buffer, contentType };
  }
}
