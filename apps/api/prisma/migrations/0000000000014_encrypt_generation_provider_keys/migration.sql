ALTER TABLE "generation_providers"
  ADD COLUMN "apiKeyEncrypted" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "imageEndpoint" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "textToImageEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "imageToImageEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "imageRequestParams" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "generate_jobs"
  ADD COLUMN "providerApiKeyEncrypted" TEXT NOT NULL DEFAULT '';

UPDATE "generation_providers" SET
  "baseUrl" = CASE
    WHEN "adapter" = 'ainb' THEN regexp_replace("baseUrl", '/+$', '') || '/v1/images/generations?async=true'
    WHEN "id" = 'change2pro' THEN regexp_replace("baseUrl", '/+$', '') || '/v1beta/models/{model}:generateContent'
    WHEN "adapter" = 'change2pro' THEN regexp_replace("baseUrl", '/+$', '') || '/v1/images/generations'
    WHEN "adapter" = 'kie' THEN regexp_replace("baseUrl", '/+$', '') || '/api/v1/jobs/createTask'
    ELSE "baseUrl"
  END,
  "imageEndpoint" = CASE
    WHEN "adapter" = 'ainb' THEN regexp_replace("baseUrl", '/+$', '') || '/v1/images/edits?async=true'
    WHEN "id" = 'change2pro' THEN regexp_replace("baseUrl", '/+$', '') || '/v1beta/models/{model}:generateContent'
    WHEN "adapter" = 'change2pro' THEN regexp_replace("baseUrl", '/+$', '') || '/v1/images/edits'
    WHEN "adapter" = 'kie' THEN regexp_replace("baseUrl", '/+$', '') || '/api/v1/jobs/createTask'
    ELSE ''
  END,
  "imageToImageEnabled" = true,
  "imageRequestParams" = "requestParams";

-- input_fidelity is valid for image edits but not text generation.
UPDATE "generation_providers"
SET "requestParams" = "requestParams" - 'input_fidelity'
WHERE "id" = 'change2pro-image';
