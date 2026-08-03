import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { UploadsService } from "./uploads.service";

function service(ossOverrides: Record<string, unknown> = {}) {
  const config = {
    get(name: string) {
      if (name === "app.oss") {
        return {
          accessKeyId: "test-id",
          accessKeySecret: "test-secret",
          bucket: "bucket",
          endpoint: "oss.example.com",
          cdnBaseUrl: "https://cdn.example.com",
          cdnAuthWindowSeconds: 1800,
          ...ossOverrides
        };
      }
      return undefined;
    }
  } as ConfigService;
  return new UploadsService(config);
}

test("builds lightweight admin thumbnails from OSS origin URLs", () => {
  const url = service().readAdminThumbnailImageUrl(
    "https://bucket.oss.example.com/uploads/work/image.png",
    "public"
  );

  assert.match(url, /^https:\/\/cdn\.example\.com\/uploads\/work\/image\.png\?/);
  assert.match(decodeURIComponent(url), /image\/resize,w_480\/quality,q_70\/format,webp/);
});

test("builds 640px Q95 WebP images for work cards", () => {
  const url = service().readResponsiveImageUrl(
    "https://bucket.oss.example.com/uploads/work/image.png",
    "public"
  );

  assert.match(decodeURIComponent(url), /image\/resize,w_640\/quality,Q_95\/format,webp/);
});

test("builds non-cropping 2048px Q95 WebP images for work detail and full-screen previews", () => {
  const url = service().readDetailPreviewImageUrl(
    "https://bucket.oss.example.com/uploads/work/image.png",
    "public"
  );

  assert.match(decodeURIComponent(url), /image\/resize,m_lfit,w_2048,h_2048\/quality,Q_95\/format,webp/);
});

test("reprocesses historical CDN URLs instead of leaving the original image", () => {
  const url = service().readAdminPreviewImageUrl(
    "https://cdn.example.com/uploads/work/image.png?auth_key=old&x-oss-process=old",
    "public"
  );

  assert.equal((url.match(/x-oss-process=/g) ?? []).length, 1);
  assert.match(decodeURIComponent(url), /image\/resize,w_1200\/quality,q_80\/format,webp/);
  assert.doesNotMatch(url, /auth_key=old/);
});

test("accepts generation references only from the configured OSS or CDN", () => {
  const uploads = service({ publicCdnBaseUrl: "https://public-cdn.example.com" });

  assert.doesNotThrow(() => uploads.assertManagedImageUrl("https://bucket.oss.example.com/uploads/prompt/reference.png?signature=test"));
  assert.doesNotThrow(() => uploads.assertManagedImageUrl("https://cdn.example.com/uploads/prompt/reference.png"));
  assert.doesNotThrow(() => uploads.assertManagedImageUrl("https://public-cdn.example.com/uploads/prompt/reference.png"));
  assert.throws(() => uploads.assertManagedImageUrl("https://untrusted.example.com/reference.png"), /参考图地址无效/);
});

test("uses a stable unauthenticated public CDN URL for published works", () => {
  const uploads = service({
    publicCdnBaseUrl: "https://public-cdn.example.com",
    cdnAuthKey: "private-key"
  });

  const url = uploads.readResponsiveImageUrl(
    "https://bucket.oss.example.com/uploads/work/image.png",
    "public"
  );

  assert.match(url, /^https:\/\/public-cdn\.example\.com\/uploads\/work\/image\.png\?/);
  assert.doesNotMatch(url, /auth_key=/);
});

test("keeps private images on the authenticated CDN domain", () => {
  const uploads = service({
    publicCdnBaseUrl: "https://public-cdn.example.com",
    cdnAuthKey: "private-key"
  });

  const url = uploads.readDetailPreviewImageUrl(
    "https://bucket.oss.example.com/uploads/work/image.png",
    "private"
  );

  assert.match(url, /^https:\/\/cdn\.example\.com\/uploads\/work\/image\.png\?/);
  assert.match(url, /auth_key=/);
});
