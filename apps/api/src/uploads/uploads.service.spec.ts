import assert from "node:assert/strict";
import test from "node:test";
import { ConfigService } from "@nestjs/config";
import { UploadsService } from "./uploads.service";

function service() {
  const config = {
    get(name: string) {
      if (name === "app.oss") {
        return {
          accessKeyId: "test-id",
          accessKeySecret: "test-secret",
          bucket: "bucket",
          endpoint: "oss.example.com",
          cdnBaseUrl: "https://cdn.example.com"
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
