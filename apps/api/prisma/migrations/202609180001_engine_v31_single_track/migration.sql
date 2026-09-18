-- Engine v3.1 配置单轨化：config JSON 成为 API 平台协议配置的唯一权威。
-- 生产库（2026-09-18 核查）8 个平台全部已有合法 config JSON；
-- 以下回填仅作为对旧环境/本地库的防御，正常不命中任何行。

UPDATE "generation_providers" SET "config" = jsonb_build_object(
  'adapter', CASE "adapter"
    WHEN 'ainb' THEN 'async-http'
    WHEN 'generic' THEN 'async-http'
    WHEN 'change2pro' THEN 'openai-images'
    WHEN 'kie' THEN 'kie'
    ELSE 'async-http' END,
  'requestMode', "requestMode",
  'textResultMode', "textResultMode",
  'imageResultMode', "imageResultMode",
  'baseUrl', "baseUrl",
  'imageEndpoint', "imageEndpoint",
  'queryEndpoint', "queryEndpoint",
  'statusEnabled', "statusEnabled",
  'responseMapping', "responseMapping",
  'resultUrlRewriteRules', "resultUrlRewriteRules",
  'textToImageEnabled', "textToImageEnabled",
  'imageToImageEnabled', "imageToImageEnabled",
  'authMode', "authMode",
  'authHeaderName', "authHeaderName",
  'authQueryName', "authQueryName",
  'requestHeaders', "requestHeaders",
  'queryHeaders', "queryHeaders",
  'requestTemplate', "requestTemplate",
  'imageRequestTemplate', "imageRequestTemplate",
  'injectModel', "injectModel",
  'injectCount', "injectCount",
  'requestParams', "requestParams",
  'imageRequestParams', "imageRequestParams",
  'imageInputMode', "imageInputMode",
  'imageInputField', "imageInputField",
  'sizeMode', "sizeMode",
  'pixelSizeField', "pixelSizeField",
  'ratioField', "ratioField",
  'resolutionField', "resolutionField"
) WHERE "config" IS NULL;

-- config.adapter 非法/缺失时按平面列归一（防历史脏数据）。
UPDATE "generation_providers" SET "config" = jsonb_set(
  "config"::jsonb,
  '{adapter}',
  to_jsonb(CASE "adapter"
    WHEN 'ainb' THEN 'async-http'
    WHEN 'generic' THEN 'async-http'
    WHEN 'change2pro' THEN 'openai-images'
    WHEN 'kie' THEN 'kie'
    ELSE 'async-http' END::text)
)
WHERE "config" IS NOT NULL
  AND COALESCE("config"::jsonb ->> 'adapter', '') NOT IN ('openai-images', 'gemini', 'kie', 'async-http');

UPDATE "generation_providers" SET "config" = '{}'::jsonb WHERE "config" IS NULL;

ALTER TABLE "generation_providers"
  DROP COLUMN "adapter",
  DROP COLUMN "requestMode",
  DROP COLUMN "textResultMode",
  DROP COLUMN "imageResultMode",
  DROP COLUMN "baseUrl",
  DROP COLUMN "imageEndpoint",
  DROP COLUMN "queryEndpoint",
  DROP COLUMN "statusEnabled",
  DROP COLUMN "responseMapping",
  DROP COLUMN "resultUrlRewriteRules",
  DROP COLUMN "textToImageEnabled",
  DROP COLUMN "imageToImageEnabled",
  DROP COLUMN "authMode",
  DROP COLUMN "authHeaderName",
  DROP COLUMN "authQueryName",
  DROP COLUMN "requestHeaders",
  DROP COLUMN "queryHeaders",
  DROP COLUMN "requestTemplate",
  DROP COLUMN "imageRequestTemplate",
  DROP COLUMN "injectModel",
  DROP COLUMN "injectCount",
  DROP COLUMN "requestParams",
  DROP COLUMN "imageRequestParams",
  DROP COLUMN "imageInputMode",
  DROP COLUMN "imageInputField",
  DROP COLUMN "sizeMode",
  DROP COLUMN "pixelSizeField",
  DROP COLUMN "ratioField",
  DROP COLUMN "resolutionField";

ALTER TABLE "generation_providers" ALTER COLUMN "config" SET NOT NULL;

-- 管理端全链路试运行标记。
ALTER TABLE "engine_jobs" ADD COLUMN "dryRun" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "engine_jobs_dryRun_createdAt_idx" ON "engine_jobs"("dryRun", "createdAt");
