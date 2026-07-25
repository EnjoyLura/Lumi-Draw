ALTER TABLE "users"
ADD COLUMN "pendingAvatarUrl" TEXT,
ADD COLUMN "avatarModerationStatus" TEXT NOT NULL DEFAULT 'unchecked';

ALTER TABLE "works"
ADD COLUMN "textModerationStatus" TEXT NOT NULL DEFAULT 'unchecked',
ADD COLUMN "imageModerationStatus" TEXT NOT NULL DEFAULT 'unchecked',
ADD COLUMN "imageModerationTraceId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "moderationReason" TEXT NOT NULL DEFAULT '';

-- Existing public content has already passed the legacy review flow. Mark it as
-- grandfathered instead of taking the live gallery offline during deployment.
UPDATE "works"
SET "textModerationStatus" = 'skipped', "imageModerationStatus" = 'skipped'
WHERE "status" = 'published' AND "isPublic" = TRUE;

UPDATE "users"
SET "avatarModerationStatus" = 'skipped'
WHERE "avatarUrl" IS NOT NULL AND "avatarUrl" <> '';

CREATE TABLE "content_moderation_tasks" (
  "id" TEXT NOT NULL,
  "traceId" TEXT,
  "userId" INTEGER NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "mediaUrl" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitting',
  "suggest" TEXT NOT NULL DEFAULT '',
  "label" INTEGER,
  "detail" JSONB,
  "errorMessage" TEXT NOT NULL DEFAULT '',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_moderation_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_moderation_tasks_traceId_key" ON "content_moderation_tasks"("traceId");
CREATE INDEX "content_moderation_tasks_targetType_targetId_idx" ON "content_moderation_tasks"("targetType", "targetId");
CREATE INDEX "content_moderation_tasks_userId_createdAt_idx" ON "content_moderation_tasks"("userId", "createdAt");
