ALTER TABLE "generation_providers"
  ADD COLUMN "textResultMode" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN "imageResultMode" TEXT NOT NULL DEFAULT 'auto';

ALTER TABLE "generate_jobs"
  ADD COLUMN "providerResultMode" TEXT NOT NULL DEFAULT 'auto';

UPDATE "generation_providers"
SET "textResultMode" = CASE
  WHEN "requestParams" ->> 'response_format' IN ('url', 'URL') THEN 'url'
  WHEN "adapter" IN ('ainb', 'kie') THEN 'url'
  ELSE 'auto'
END,
"imageResultMode" = CASE
  WHEN "imageRequestParams" ->> 'response_format' IN ('url', 'URL') THEN 'url'
  WHEN "adapter" IN ('ainb', 'kie') THEN 'url'
  ELSE 'auto'
END;
