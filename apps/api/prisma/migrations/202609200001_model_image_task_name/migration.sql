-- 模型的图生图上游任务名：部分平台同一模型的文生图/图生图是两个任务名（如 seedream/4.5-text-to-image 与 seedream/4.5-edit）。
-- providerModel 保持文生图语义，图生图留空时沿用 providerModel。
ALTER TABLE "model_configs" ADD COLUMN IF NOT EXISTS "providerModelImage" TEXT;

-- KIE 平台下线：provider 的默认值不再指向已删除的平台。
ALTER TABLE "model_configs" ALTER COLUMN "provider" SET DEFAULT '';
