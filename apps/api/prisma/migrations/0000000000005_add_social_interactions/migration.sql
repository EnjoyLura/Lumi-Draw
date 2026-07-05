-- CreateTable
CREATE TABLE "work_interactions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "workId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_views" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "workId" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" SERIAL NOT NULL,
    "followerId" INTEGER NOT NULL,
    "followingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_interactions_userId_workId_type_key" ON "work_interactions"("userId", "workId", "type");

-- CreateIndex
CREATE INDEX "work_interactions_userId_type_idx" ON "work_interactions"("userId", "type");

-- CreateIndex
CREATE INDEX "work_interactions_workId_type_idx" ON "work_interactions"("workId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "work_views_userId_workId_key" ON "work_views"("userId", "workId");

-- CreateIndex
CREATE INDEX "work_views_userId_viewedAt_idx" ON "work_views"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");
