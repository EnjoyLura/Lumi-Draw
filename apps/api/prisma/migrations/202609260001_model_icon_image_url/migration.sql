-- 模型图标：管理后台上传的 OSS 图片，存原始 key，展示时映射 CDN URL
ALTER TABLE "model_configs" ADD COLUMN "imageUrl" TEXT NOT NULL DEFAULT '';
