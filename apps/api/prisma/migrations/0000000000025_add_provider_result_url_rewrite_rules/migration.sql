ALTER TABLE "generation_providers"
  ADD COLUMN "resultUrlRewriteRules" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "generate_jobs"
  ADD COLUMN "providerResultUrlRewriteRules" JSONB NOT NULL DEFAULT '[]';
