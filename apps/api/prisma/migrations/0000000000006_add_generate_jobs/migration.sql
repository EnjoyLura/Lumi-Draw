-- CreateTable
CREATE TABLE "generate_jobs" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'kie',
    "providerModel" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL,
    "inputImageUrl" TEXT NOT NULL DEFAULT '',
    "gameplayId" INTEGER,
    "style" TEXT NOT NULL DEFAULT '',
    "ratio" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "costCredits" INTEGER NOT NULL,
    "refundCredits" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "stageText" TEXT NOT NULL DEFAULT '',
    "kieTaskId" TEXT,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "retryOfJobId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generate_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generate_results" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "ossKey" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "workId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generate_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generate_jobs_kieTaskId_key" ON "generate_jobs"("kieTaskId");

-- CreateIndex
CREATE INDEX "generate_jobs_userId_createdAt_idx" ON "generate_jobs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "generate_jobs_status_createdAt_idx" ON "generate_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "generate_results_jobId_idx" ON "generate_results"("jobId");

-- AddForeignKey
ALTER TABLE "generate_jobs" ADD CONSTRAINT "generate_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generate_results" ADD CONSTRAINT "generate_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "generate_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
