-- Image Engine v3 baseline: provider config JSON + engine job/attempt/asset tables.
-- Additive only: the legacy generate_* tables and columns stay untouched.

ALTER TABLE "generation_providers" ADD COLUMN IF NOT EXISTS "config" JSONB;

-- Backfill provider config JSON from the legacy flat columns so the new engine
-- reads a single source. Legacy adapters fold into protocol families:
-- ainb/generic -> async-http, change2pro -> openai-images, kie -> kie.
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

CREATE TABLE "engine_jobs" (
    "id" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelRevision" BIGINT NOT NULL DEFAULT 0,
    "qualityId" INTEGER NOT NULL,
    "ratioId" INTEGER NOT NULL,
    "ratio" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "styleId" INTEGER,
    "gameplayId" INTEGER,
    "count" INTEGER NOT NULL,
    "inputImageUrls" JSONB NOT NULL DEFAULT '[]',
    "providerId" TEXT NOT NULL,
    "providerAttemptIndex" INTEGER NOT NULL DEFAULT 0,
    "providerCandidates" JSONB NOT NULL DEFAULT '[]',
    "providerSnapshot" JSONB,
    "costCredits" INTEGER NOT NULL,
    "refundCredits" INTEGER NOT NULL DEFAULT 0,
    "billingState" TEXT NOT NULL DEFAULT 'reserved',
    "walletBillNo" TEXT NOT NULL DEFAULT '',
    "walletRefunded" BOOLEAN NOT NULL DEFAULT false,
    "walletPendingRefund" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "stageText" TEXT NOT NULL DEFAULT '',
    "failureCode" INTEGER NOT NULL DEFAULT 0,
    "failureMessage" TEXT NOT NULL DEFAULT '',
    "submitDeadlineAt" TIMESTAMP(3),
    "totalTimeoutAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "retryOfJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engine_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "engine_attempts" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL DEFAULT '',
    "adapter" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "upstreamTaskId" TEXT NOT NULL DEFAULT '',
    "errorKind" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "latencyMs" INTEGER,
    "nextPollAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engine_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "engine_assets" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerUrl" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "ossKey" TEXT NOT NULL DEFAULT '',
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "transferAttempts" INTEGER NOT NULL DEFAULT 0,
    "transferLastAttemptAt" TIMESTAMP(3),
    "transferNextAttemptAt" TIMESTAMP(3),
    "transferHost" TEXT NOT NULL DEFAULT '',
    "transferFallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "transferTtfbMs" INTEGER,
    "transferDownloadMs" INTEGER,
    "transferUploadMs" INTEGER,
    "workId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engine_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "engine_jobs_clientRequestId_key" ON "engine_jobs"("clientRequestId");
CREATE INDEX "engine_jobs_userId_createdAt_idx" ON "engine_jobs"("userId", "createdAt");
CREATE INDEX "engine_jobs_status_updatedAt_idx" ON "engine_jobs"("status", "updatedAt");

CREATE INDEX "engine_attempts_jobId_idx" ON "engine_attempts"("jobId");
CREATE INDEX "engine_attempts_providerId_startedAt_idx" ON "engine_attempts"("providerId", "startedAt");
CREATE INDEX "engine_attempts_state_nextPollAt_idx" ON "engine_attempts"("state", "nextPollAt");

CREATE INDEX "engine_assets_jobId_idx" ON "engine_assets"("jobId");
CREATE INDEX "engine_assets_status_transferNextAttemptAt_idx" ON "engine_assets"("status", "transferNextAttemptAt");

ALTER TABLE "engine_jobs" ADD CONSTRAINT "engine_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "engine_attempts" ADD CONSTRAINT "engine_attempts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "engine_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engine_assets" ADD CONSTRAINT "engine_assets_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "engine_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
