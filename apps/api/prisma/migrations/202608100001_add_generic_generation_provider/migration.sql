ALTER TABLE "generation_providers"
  ADD COLUMN "authMode" TEXT NOT NULL DEFAULT 'bearer',
  ADD COLUMN "authHeaderName" TEXT NOT NULL DEFAULT 'Authorization',
  ADD COLUMN "authQueryName" TEXT NOT NULL DEFAULT 'api_key',
  ADD COLUMN "requestHeaders" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "queryHeaders" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "requestTemplate" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "imageRequestTemplate" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "injectModel" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "injectCount" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "generate_jobs"
  ADD COLUMN "providerAuthMode" TEXT NOT NULL DEFAULT 'bearer',
  ADD COLUMN "providerAuthHeaderName" TEXT NOT NULL DEFAULT 'Authorization',
  ADD COLUMN "providerAuthQueryName" TEXT NOT NULL DEFAULT 'api_key',
  ADD COLUMN "providerRequestHeaders" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "providerQueryHeaders" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "providerRequestTemplate" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "providerInjectModel" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "providerInjectCount" BOOLEAN NOT NULL DEFAULT true;
