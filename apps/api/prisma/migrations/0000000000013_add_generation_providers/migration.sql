CREATE TABLE "generation_providers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "adapter" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "apiKeyEnv" TEXT NOT NULL,
  "requestParams" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "generation_providers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "generate_jobs"
  ADD COLUMN "providerAdapter" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "providerBaseUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "providerApiKeyEnv" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "providerParams" JSONB;

INSERT INTO "generation_providers" ("id", "name", "adapter", "baseUrl", "apiKeyEnv", "requestParams", "enabled", "sort") VALUES
  ('ainb', 'Ainb', 'ainb', 'https://ainb.plus', 'AINB_IMAGE_API_KEY', '{"quality":"high","response_format":"url","output_format":"png"}'::jsonb, true, 1),
  ('change2pro-image', 'Change2Pro Image', 'change2pro', 'https://api.change2pro.com', 'CHANGE2PRO_IMAGE_API_KEY', '{"quality":"high","input_fidelity":"high","output_format":"webp","response_format":"url","moderation":"low","output_compression":"90"}'::jsonb, true, 2),
  ('change2pro', 'Change2Pro Banana', 'change2pro', 'https://api.change2pro.com', 'CHANGE2PRO_BANANA_API_KEY', '{}'::jsonb, true, 3),
  ('kie', 'KIE', 'kie', 'https://api.kie.ai', 'KIE_API_KEY', '{}'::jsonb, true, 4)
ON CONFLICT ("id") DO NOTHING;

UPDATE "model_configs" SET "provider" = 'ainb' WHERE "id" = 'gpt-image-2';
UPDATE "model_configs" SET "provider" = 'change2pro' WHERE "id" IN ('nano-banana-2', 'nano-banana-pro');
UPDATE "model_configs" SET "provider" = 'kie' WHERE "id" NOT IN ('gpt-image-2', 'nano-banana-2', 'nano-banana-pro');

UPDATE "generate_jobs" AS jobs SET
  "providerAdapter" = providers."adapter",
  "providerBaseUrl" = providers."baseUrl",
  "providerApiKeyEnv" = providers."apiKeyEnv",
  "providerParams" = providers."requestParams"
FROM "generation_providers" AS providers
WHERE jobs."provider" = providers."id";

UPDATE "generate_jobs" SET
  "providerAdapter" = 'change2pro',
  "providerBaseUrl" = 'https://api.change2pro.com',
  "providerApiKeyEnv" = 'CHANGE2PRO_IMAGE_API_KEY',
  "providerParams" = '{"quality":"high","input_fidelity":"high","output_format":"webp","response_format":"url","moderation":"low","output_compression":"90"}'::jsonb
WHERE "provider" = 'change2pro' AND "modelId" = 'gpt-image-2';
