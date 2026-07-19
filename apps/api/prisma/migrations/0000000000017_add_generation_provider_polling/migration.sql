ALTER TABLE "generation_providers"
  ADD COLUMN "requestMode" TEXT NOT NULL DEFAULT 'sync',
  ADD COLUMN "queryEndpoint" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "statusEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "responseMapping" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "generate_jobs"
  ADD COLUMN "providerRequestMode" TEXT NOT NULL DEFAULT 'sync',
  ADD COLUMN "providerQueryEndpoint" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "providerStatusEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "providerResponseMapping" JSONB;

UPDATE "generation_providers"
SET
  "requestMode" = 'async',
  "statusEnabled" = true,
  "responseMapping" = '{"taskIdPath":"task_id","statusPath":"data.status","progressPath":"data.progress","resultUrlPath":"data.data.data[].url","errorPath":"data.fail_reason","successValue":"SUCCESS","failureValue":"FAILURE","pendingValue":"IN_PROGRESS"}'::jsonb
WHERE "adapter" = 'ainb';

UPDATE "generation_providers"
SET "queryEndpoint" = 'https://ainb.plus/v1/images/tasks/{task_id}'
WHERE "adapter" = 'ainb' AND "baseUrl" LIKE 'https://ainb.plus/%';

UPDATE "generation_providers"
SET
  "requestMode" = 'async',
  "statusEnabled" = true
WHERE "adapter" = 'kie';

UPDATE "generation_providers"
SET "queryEndpoint" = 'https://api.kie.ai/api/v1/jobs/recordInfo?taskId={task_id}'
WHERE "adapter" = 'kie' AND "baseUrl" LIKE 'https://api.kie.ai/%';
